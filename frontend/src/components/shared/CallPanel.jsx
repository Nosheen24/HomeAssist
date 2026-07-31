import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '../ui/Toast';

// Free public STUN handles the common cases. For calls between two phones on
// different mobile networks you'll also need a TURN server — add its
// { urls, username, credential } entry here and calls will fall back to it.
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

// Call lifecycle: idle → (caller) calling / (callee) ringing → connected → idle
export default function CallPanel({ bookingId }) {
  const toast = useToast();
  const [status, setStatus] = useState('idle');
  const [incoming, setIncoming] = useState(null); // { from, video }
  const [remoteName, setRemoteName] = useState('');
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [isVideo, setIsVideo] = useState(false);

  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pendingCandidatesRef = useRef([]); // ICE that arrives before remote desc is set
  const offerRef = useRef(null);
  const statusRef = useRef('idle');

  const setCallStatus = (s) => {
    statusRef.current = s;
    setStatus(s);
  };

  const send = (msg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
  };

  // Tear everything down and return to idle.
  const cleanup = useCallback((notifyPeer = false) => {
    if (notifyPeer) send({ type: 'hangup' });
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    pendingCandidatesRef.current = [];
    offerRef.current = null;
    setIncoming(null);
    setMuted(false);
    setCamOff(false);
    setCallStatus('idle');
  }, []);

  const getMedia = async (video) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    localStreamRef.current = stream;
    if (video && localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  };

  const createPeer = useCallback((stream) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    pc.onicecandidate = (e) => {
      if (e.candidate) send({ type: 'ice-candidate', candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };
    pc.onconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        if (statusRef.current === 'connected') toast('Call disconnected', 'info');
        cleanup(false);
      }
    };
    pcRef.current = pc;
    return pc;
  }, [cleanup, toast]);

  const flushCandidates = async () => {
    const pc = pcRef.current;
    if (!pc) return;
    for (const c of pendingCandidatesRef.current) {
      try { await pc.addIceCandidate(c); } catch { /* ignore late/duplicate candidates */ }
    }
    pendingCandidatesRef.current = [];
  };

  // ─── Signaling: connect the WebSocket for this booking and route messages ───
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${window.location.host}/ws/call?bookingId=${bookingId}&token=${token}`);
    wsRef.current = ws;

    ws.onmessage = async (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }

      if (msg.type === 'offer') {
        // Ignore a second incoming call while already busy.
        if (statusRef.current !== 'idle') { send({ type: 'reject', reason: 'busy' }); return; }
        offerRef.current = msg.sdp;
        setRemoteName(msg.from?.name || 'Caller');
        setIncoming({ from: msg.from, video: !!msg.video });
        setCallStatus('ringing');
      } else if (msg.type === 'answer') {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          await flushCandidates();
          setCallStatus('connected');
        }
      } else if (msg.type === 'ice-candidate') {
        const candidate = new RTCIceCandidate(msg.candidate);
        if (pcRef.current && pcRef.current.remoteDescription) {
          try { await pcRef.current.addIceCandidate(candidate); } catch { /* ignore */ }
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      } else if (msg.type === 'reject') {
        toast(msg.reason === 'busy' ? 'They are on another call' : 'Call declined', 'info');
        cleanup(false);
      } else if (msg.type === 'hangup' || msg.type === 'peer-left') {
        if (statusRef.current !== 'idle') {
          if (msg.type === 'hangup') toast('Call ended', 'info');
          cleanup(false);
        }
      }
    };

    ws.onclose = () => { if (statusRef.current !== 'idle') cleanup(false); };

    return () => {
      ws.close();
      wsRef.current = null;
      cleanup(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // ─── Caller: start a call ───
  const startCall = async (video) => {
    try {
      setIsVideo(video);
      const stream = await getMedia(video);
      const pc = createPeer(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send({ type: 'offer', sdp: offer, video });
      setCallStatus('calling');
    } catch (err) {
      toast(err.name === 'NotAllowedError' ? 'Camera/microphone permission denied' : 'Could not start call', 'error');
      cleanup(false);
    }
  };

  // ─── Callee: accept the incoming call ───
  const acceptCall = async () => {
    try {
      const video = incoming?.video || false;
      setIsVideo(video);
      const stream = await getMedia(video);
      const pc = createPeer(stream);
      await pc.setRemoteDescription(new RTCSessionDescription(offerRef.current));
      await flushCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send({ type: 'answer', sdp: answer });
      setIncoming(null);
      setCallStatus('connected');
    } catch (err) {
      toast(err.name === 'NotAllowedError' ? 'Camera/microphone permission denied' : 'Could not join call', 'error');
      send({ type: 'reject' });
      cleanup(false);
    }
  };

  const rejectCall = () => { send({ type: 'reject' }); cleanup(false); };
  const hangup = () => cleanup(true);

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMuted(!track.enabled); }
  };
  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCamOff(!track.enabled); }
  };

  return (
    <>
      {/* Call buttons live in the chat header */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => startCall(false)}
          disabled={status !== 'idle'}
          title="Voice call"
          className="inline-flex items-center justify-center h-7 w-7 rounded-full text-ha-primary hover:bg-ha-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>
        <button
          onClick={() => startCall(true)}
          disabled={status !== 'idle'}
          title="Video call"
          className="inline-flex items-center justify-center h-7 w-7 rounded-full text-ha-primary hover:bg-ha-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {/* Incoming call prompt */}
      {status === 'ringing' && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center px-4">
          <div className="bg-ha-surface rounded-2xl border border-ha-border p-6 w-full max-w-sm text-center shadow-xl">
            <div className="text-4xl mb-3 animate-pulse">{incoming?.video ? '📹' : '📞'}</div>
            <h3 className="text-lg font-semibold text-ha-text-1">{remoteName}</h3>
            <p className="text-sm text-ha-text-3 mt-1">Incoming {incoming?.video ? 'video' : 'voice'} call…</p>
            <div className="flex gap-3 mt-6">
              <button onClick={rejectCall} className="flex-1 rounded-xl bg-ha-danger/10 border border-ha-danger text-ha-danger font-semibold py-2.5 hover:bg-ha-danger/20 transition-colors">
                Decline
              </button>
              <button onClick={acceptCall} className="flex-1 rounded-xl bg-ha-teal/10 border border-ha-teal text-ha-teal font-semibold py-2.5 hover:bg-ha-teal/20 transition-colors">
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active / dialing call overlay */}
      {(status === 'calling' || status === 'connected') && (
        <div className="fixed inset-0 z-[60] bg-ha-bg/95 flex flex-col items-center justify-center px-4">
          <div className="relative w-full max-w-2xl aspect-video rounded-2xl overflow-hidden bg-black border border-ha-border">
            {/* Remote video (audio-only calls still play through this element) */}
            <video ref={remoteVideoRef} autoPlay playsInline className={`w-full h-full object-cover ${isVideo ? '' : 'hidden'}`} />
            {!isVideo && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-5xl mb-3">📞</div>
                <p className="text-ha-text-1 font-semibold text-lg">{remoteName || 'On call'}</p>
              </div>
            )}
            {status === 'calling' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                <div className="text-4xl mb-3 animate-pulse">{isVideo ? '📹' : '📞'}</div>
                <p className="text-white font-medium">Calling…</p>
              </div>
            )}
            {/* Local preview (video calls only) */}
            {isVideo && (
              <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-3 right-3 w-28 h-20 object-cover rounded-lg border-2 border-white/60 shadow-lg" />
            )}
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={toggleMute}
              title={muted ? 'Unmute' : 'Mute'}
              className={`h-12 w-12 rounded-full flex items-center justify-center border transition-colors ${muted ? 'bg-ha-danger/10 border-ha-danger text-ha-danger' : 'bg-ha-surface border-ha-border text-ha-text-1 hover:bg-ha-surface-2'}`}
            >
              {muted ? '🔇' : '🎙️'}
            </button>
            {isVideo && (
              <button
                onClick={toggleCam}
                title={camOff ? 'Turn camera on' : 'Turn camera off'}
                className={`h-12 w-12 rounded-full flex items-center justify-center border transition-colors ${camOff ? 'bg-ha-danger/10 border-ha-danger text-ha-danger' : 'bg-ha-surface border-ha-border text-ha-text-1 hover:bg-ha-surface-2'}`}
              >
                {camOff ? '📷' : '🎥'}
              </button>
            )}
            <button
              onClick={hangup}
              title="Hang up"
              className="h-12 w-12 rounded-full flex items-center justify-center bg-ha-danger text-white hover:opacity-90 transition-opacity"
            >
              <svg className="h-5 w-5 rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
