const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const categories = [
  { name: 'Plumbing',         icon: '🔧', slug: 'plumbing' },
  { name: 'Electrical',       icon: '⚡', slug: 'electrical' },
  { name: 'Cleaning',         icon: '🧹', slug: 'cleaning' },
  { name: 'Carpentry',        icon: '🪚', slug: 'carpentry' },
  { name: 'AC Repair',        icon: '❄️', slug: 'ac-repair' },
  { name: 'Painting',         icon: '🎨', slug: 'painting' },
  { name: 'Appliance Repair', icon: '🔌', slug: 'appliance-repair' },
  { name: 'Gardening',        icon: '🌿', slug: 'gardening' },
];

const providerData = [
  {
    name: 'Ahmed Hassan',      email: 'ahmed@example.com',   phone: '0300-1234567', location: 'Lahore',
    bio: 'Expert plumber with 10 years of experience. Specializes in pipe installation, leak repair, and bathroom fixtures.',
    experienceYears: 10, serviceArea: 'Lahore, DHA, Gulberg', isVerified: true, avgRating: 4.8, reviewCount: 124,
    profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ahmed',
    categories: ['plumbing'],
    services: [
      { title: 'Pipe Leak Repair',      price: 800,  priceUnit: 'fixed', slug: 'plumbing' },
      { title: 'Tap Installation',      price: 500,  priceUnit: 'fixed', slug: 'plumbing' },
      { title: 'Drainage Cleaning',     price: 1200, priceUnit: 'fixed', slug: 'plumbing' },
    ],
    availability: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 3, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 4, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '18:00' },
    ],
  },
  {
    name: 'Bilal Chaudhry',    email: 'bilal@example.com',   phone: '0301-2345678', location: 'Lahore',
    bio: 'Licensed electrician. Expert in wiring, panel upgrades, and electrical fault-finding.',
    experienceYears: 8, serviceArea: 'Lahore, Johar Town, Bahria Town', isVerified: true, avgRating: 4.7, reviewCount: 98,
    profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bilal',
    categories: ['electrical'],
    services: [
      { title: 'Wiring & Installation',  price: 2000, priceUnit: 'fixed', slug: 'electrical' },
      { title: 'Fault Finding',          price: 600,  priceUnit: 'fixed', slug: 'electrical' },
      { title: 'Fan Installation',       price: 400,  priceUnit: 'fixed', slug: 'electrical' },
    ],
    availability: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '20:00' },
      { dayOfWeek: 2, startTime: '08:00', endTime: '20:00' },
      { dayOfWeek: 3, startTime: '08:00', endTime: '20:00' },
      { dayOfWeek: 4, startTime: '08:00', endTime: '20:00' },
      { dayOfWeek: 6, startTime: '10:00', endTime: '16:00' },
    ],
  },
  {
    name: 'Fatima Malik',      email: 'fatima@example.com',  phone: '0302-3456789', location: 'Karachi',
    bio: 'Professional home cleaning service. Experienced team for deep cleaning, regular maintenance, and post-construction cleanup.',
    experienceYears: 5, serviceArea: 'Karachi, DHA, Clifton', isVerified: true, avgRating: 4.9, reviewCount: 215,
    profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fatima',
    categories: ['cleaning'],
    services: [
      { title: 'Deep Home Cleaning',    price: 3500, priceUnit: 'fixed',  slug: 'cleaning' },
      { title: 'Regular Cleaning',      price: 1500, priceUnit: 'per visit', slug: 'cleaning' },
      { title: 'Carpet Cleaning',       price: 800,  priceUnit: 'per room', slug: 'cleaning' },
    ],
    availability: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 6, startTime: '10:00', endTime: '14:00' },
    ],
  },
  {
    name: 'Usman Tariq',       email: 'usman@example.com',   phone: '0303-4567890', location: 'Islamabad',
    bio: 'Master carpenter with expertise in custom furniture, wood work, and kitchen cabinet installations.',
    experienceYears: 12, serviceArea: 'Islamabad, Rawalpindi, F-7, G-9', isVerified: true, avgRating: 4.6, reviewCount: 87,
    profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=usman',
    categories: ['carpentry'],
    services: [
      { title: 'Custom Furniture',      price: 15000, priceUnit: 'per piece', slug: 'carpentry' },
      { title: 'Door/Window Repair',    price: 1000,  priceUnit: 'fixed',     slug: 'carpentry' },
      { title: 'Kitchen Cabinets',      price: 25000, priceUnit: 'per set',   slug: 'carpentry' },
    ],
    availability: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 4, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '18:00' },
    ],
  },
  {
    name: 'Zubair Ahmed',      email: 'zubair@example.com',  phone: '0304-5678901', location: 'Lahore',
    bio: 'Certified AC technician. Expert in all AC brands. Servicing, gas refilling, installation and repair.',
    experienceYears: 7, serviceArea: 'Lahore, Model Town, Garden Town', isVerified: true, avgRating: 4.8, reviewCount: 156,
    profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zubair',
    categories: ['ac-repair'],
    services: [
      { title: 'AC General Service',   price: 2500, priceUnit: 'fixed', slug: 'ac-repair' },
      { title: 'Gas Refilling',        price: 3500, priceUnit: 'fixed', slug: 'ac-repair' },
      { title: 'AC Installation',      price: 4000, priceUnit: 'fixed', slug: 'ac-repair' },
    ],
    availability: [
      { dayOfWeek: 0, startTime: '10:00', endTime: '20:00' },
      { dayOfWeek: 1, startTime: '09:00', endTime: '20:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '20:00' },
      { dayOfWeek: 3, startTime: '09:00', endTime: '20:00' },
      { dayOfWeek: 4, startTime: '09:00', endTime: '20:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '20:00' },
      { dayOfWeek: 6, startTime: '10:00', endTime: '18:00' },
    ],
  },
  {
    name: 'Kamran Shah',       email: 'kamran@example.com',  phone: '0305-6789012', location: 'Karachi',
    bio: 'Professional painter with 15 years experience. Interior and exterior painting, waterproofing solutions.',
    experienceYears: 15, serviceArea: 'Karachi, PECHS, Gulshan', isVerified: true, avgRating: 4.5, reviewCount: 73,
    profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kamran',
    categories: ['painting'],
    services: [
      { title: 'Interior Painting',    price: 1200, priceUnit: 'per room', slug: 'painting' },
      { title: 'Exterior Painting',    price: 800,  priceUnit: 'per 100sqft', slug: 'painting' },
      { title: 'Waterproofing',        price: 3000, priceUnit: 'fixed',    slug: 'painting' },
    ],
    availability: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '18:00' },
      { dayOfWeek: 2, startTime: '08:00', endTime: '18:00' },
      { dayOfWeek: 3, startTime: '08:00', endTime: '18:00' },
      { dayOfWeek: 4, startTime: '08:00', endTime: '18:00' },
      { dayOfWeek: 5, startTime: '08:00', endTime: '18:00' },
    ],
  },
  {
    name: 'Imran Khan',        email: 'imrankh@example.com', phone: '0306-7890123', location: 'Islamabad',
    bio: 'Appliance repair specialist. Washing machines, refrigerators, microwaves, geysers — all brands.',
    experienceYears: 9, serviceArea: 'Islamabad, Rawalpindi, Blue Area', isVerified: true, avgRating: 4.7, reviewCount: 141,
    profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=imrankh',
    categories: ['appliance-repair'],
    services: [
      { title: 'Washing Machine Repair', price: 1500, priceUnit: 'fixed', slug: 'appliance-repair' },
      { title: 'Refrigerator Repair',    price: 2000, priceUnit: 'fixed', slug: 'appliance-repair' },
      { title: 'Geyser Service',         price: 800,  priceUnit: 'fixed', slug: 'appliance-repair' },
    ],
    availability: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '19:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '19:00' },
      { dayOfWeek: 3, startTime: '09:00', endTime: '19:00' },
      { dayOfWeek: 4, startTime: '09:00', endTime: '19:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '19:00' },
      { dayOfWeek: 6, startTime: '10:00', endTime: '16:00' },
    ],
  },
  {
    name: 'Naveed Akhtar',     email: 'naveed@example.com',  phone: '0307-8901234', location: 'Lahore',
    bio: 'Plumbing & electrical both. 15+ years experience, available 7 days a week for emergency calls.',
    experienceYears: 15, serviceArea: 'Lahore, Cantt, Wapda Town', isVerified: false, avgRating: 4.3, reviewCount: 55,
    profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=naveed',
    categories: ['plumbing', 'electrical'],
    services: [
      { title: 'Emergency Plumbing',   price: 1500, priceUnit: 'fixed', slug: 'plumbing' },
      { title: 'Electrical Checkup',   price: 700,  priceUnit: 'fixed', slug: 'electrical' },
    ],
    availability: [
      { dayOfWeek: 0, startTime: '08:00', endTime: '22:00' },
      { dayOfWeek: 1, startTime: '08:00', endTime: '22:00' },
      { dayOfWeek: 2, startTime: '08:00', endTime: '22:00' },
      { dayOfWeek: 3, startTime: '08:00', endTime: '22:00' },
      { dayOfWeek: 4, startTime: '08:00', endTime: '22:00' },
      { dayOfWeek: 5, startTime: '08:00', endTime: '22:00' },
      { dayOfWeek: 6, startTime: '08:00', endTime: '22:00' },
    ],
  },
  {
    name: 'Sana Rehman',       email: 'sana@example.com',    phone: '0308-9012345', location: 'Karachi',
    bio: 'Professional gardening and lawn care expert. Landscaping, tree trimming, plant care.',
    experienceYears: 6, serviceArea: 'Karachi, Defence, Korangi', isVerified: true, avgRating: 4.6, reviewCount: 63,
    profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sana',
    categories: ['gardening'],
    services: [
      { title: 'Lawn Maintenance',     price: 2000, priceUnit: 'per visit', slug: 'gardening' },
      { title: 'Landscaping Design',   price: 15000, priceUnit: 'fixed',   slug: 'gardening' },
      { title: 'Tree Trimming',        price: 1500, priceUnit: 'per tree', slug: 'gardening' },
    ],
    availability: [
      { dayOfWeek: 1, startTime: '07:00', endTime: '15:00' },
      { dayOfWeek: 3, startTime: '07:00', endTime: '15:00' },
      { dayOfWeek: 5, startTime: '07:00', endTime: '15:00' },
      { dayOfWeek: 6, startTime: '07:00', endTime: '13:00' },
    ],
  },
  {
    name: 'Tariq Mehmood',     email: 'tariq@example.com',   phone: '0309-0123456', location: 'Islamabad',
    bio: 'AC & refrigeration specialist. Quick diagnosis, genuine parts, best price guarantee.',
    experienceYears: 11, serviceArea: 'Islamabad, G-10, G-11, F-10', isVerified: true, avgRating: 4.9, reviewCount: 189,
    profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tariq',
    categories: ['ac-repair', 'appliance-repair'],
    services: [
      { title: 'Split AC Service',     price: 2500, priceUnit: 'fixed', slug: 'ac-repair' },
      { title: 'Deep AC Cleaning',     price: 3500, priceUnit: 'fixed', slug: 'ac-repair' },
      { title: 'Fridge Repair',        price: 2000, priceUnit: 'fixed', slug: 'appliance-repair' },
    ],
    availability: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '19:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '19:00' },
      { dayOfWeek: 3, startTime: '09:00', endTime: '19:00' },
      { dayOfWeek: 4, startTime: '09:00', endTime: '19:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '19:00' },
    ],
  },
  {
    name: 'Rashid Ali',        email: 'rashid@example.com',  phone: '0311-1234567', location: 'Lahore',
    bio: 'Skilled carpenter specializing in modern furniture, wood polish, and repair work.',
    experienceYears: 8, serviceArea: 'Lahore, Gulberg, Liberty', isVerified: true, avgRating: 4.4, reviewCount: 47,
    profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rashid',
    categories: ['carpentry', 'painting'],
    services: [
      { title: 'Furniture Polish',     price: 3000, priceUnit: 'fixed',    slug: 'carpentry' },
      { title: 'Cabinet Making',       price: 12000, priceUnit: 'per piece', slug: 'carpentry' },
      { title: 'Wood Painting',        price: 1500, priceUnit: 'fixed',    slug: 'painting' },
    ],
    availability: [
      { dayOfWeek: 1, startTime: '10:00', endTime: '18:00' },
      { dayOfWeek: 2, startTime: '10:00', endTime: '18:00' },
      { dayOfWeek: 3, startTime: '10:00', endTime: '18:00' },
      { dayOfWeek: 4, startTime: '10:00', endTime: '18:00' },
      { dayOfWeek: 5, startTime: '10:00', endTime: '18:00' },
    ],
  },
  {
    name: 'Asif Javed',        email: 'asif@example.com',    phone: '0312-2345678', location: 'Karachi',
    bio: 'Senior electrician. Solar panel installations, industrial & residential wiring, UPS setup.',
    experienceYears: 14, serviceArea: 'Karachi, Nazimabad, North Nazimabad', isVerified: true, avgRating: 4.8, reviewCount: 102,
    profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=asif',
    categories: ['electrical'],
    services: [
      { title: 'Solar Installation',   price: 50000, priceUnit: 'per system', slug: 'electrical' },
      { title: 'UPS Setup',            price: 2000,  priceUnit: 'fixed',      slug: 'electrical' },
      { title: 'Residential Wiring',   price: 5000,  priceUnit: 'fixed',      slug: 'electrical' },
    ],
    availability: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 2, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 3, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 4, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 5, startTime: '08:00', endTime: '17:00' },
    ],
  },
  {
    name: 'Nadia Hussain',     email: 'nadia@example.com',   phone: '0313-3456789', location: 'Islamabad',
    bio: 'Home and office cleaning expert. Eco-friendly products, reliable and thorough service.',
    experienceYears: 4, serviceArea: 'Islamabad, E-7, F-6, F-8', isVerified: false, avgRating: 4.5, reviewCount: 38,
    profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nadia',
    categories: ['cleaning'],
    services: [
      { title: 'Office Cleaning',      price: 4000, priceUnit: 'per visit', slug: 'cleaning' },
      { title: 'Home Deep Clean',      price: 3000, priceUnit: 'fixed',     slug: 'cleaning' },
      { title: 'Post-Party Cleanup',   price: 2500, priceUnit: 'fixed',     slug: 'cleaning' },
    ],
    availability: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 3, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 4, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 6, startTime: '10:00', endTime: '15:00' },
    ],
  },
  {
    name: 'Hassan Raza',       email: 'hassan@example.com',  phone: '0314-4567890', location: 'Lahore',
    bio: 'Plumbing contractor. Specializes in new construction plumbing and complete bathroom renovation.',
    experienceYears: 13, serviceArea: 'Lahore, Allama Iqbal Town, Faisal Town', isVerified: true, avgRating: 4.6, reviewCount: 91,
    profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hassan',
    categories: ['plumbing'],
    services: [
      { title: 'Bathroom Renovation',  price: 20000, priceUnit: 'fixed',    slug: 'plumbing' },
      { title: 'Water Tank Cleaning',  price: 1500,  priceUnit: 'per tank', slug: 'plumbing' },
      { title: 'Sewer Line Repair',    price: 3000,  priceUnit: 'fixed',    slug: 'plumbing' },
    ],
    availability: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 2, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 3, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 4, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 5, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 6, startTime: '09:00', endTime: '14:00' },
    ],
  },
  {
    name: 'Waqas Butt',        email: 'waqas@example.com',   phone: '0315-5678901', location: 'Karachi',
    bio: 'Multi-skill professional: painting, minor carpentry, and general repairs all under one roof.',
    experienceYears: 6, serviceArea: 'Karachi, Landhi, Korangi, Shah Faisal', isVerified: false, avgRating: 4.2, reviewCount: 29,
    profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=waqas',
    categories: ['painting', 'carpentry'],
    services: [
      { title: 'Wall Painting',        price: 900,  priceUnit: 'per room', slug: 'painting' },
      { title: 'Minor Carpentry',      price: 1200, priceUnit: 'fixed',    slug: 'carpentry' },
    ],
    availability: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 6, startTime: '09:00', endTime: '15:00' },
    ],
  },
];

const reviewComments = [
  'Excellent work, very professional and on time!',
  'Great service, will definitely hire again.',
  'Fixed the issue quickly, reasonable price.',
  'Very knowledgeable and polite. Highly recommended.',
  'Good work but arrived a bit late. Overall satisfied.',
  'Outstanding! The best in the area.',
  'Did a clean job, no mess left behind.',
  'Fair pricing and honest about what needs to be done.',
  'Fast response and quality work.',
  'Very thorough and detailed in their work.',
];

async function main() {
  console.log('Seeding database...');

  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.providerService.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.user.deleteMany();
  await prisma.serviceCategory.deleteMany();

  const createdCategories = {};
  for (const cat of categories) {
    const c = await prisma.serviceCategory.create({ data: cat });
    createdCategories[cat.slug] = c;
  }
  console.log(`Created ${categories.length} categories`);

  const adminUser = await prisma.user.create({
    data: {
      role: 'admin',
      name: 'Admin User',
      email: 'admin@homeassist.pk',
      passwordHash: await bcrypt.hash('admin123', 10),
      phone: '0300-0000000',
      location: 'Lahore',
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      role: 'customer',
      name: 'Sara Qureshi',
      email: 'customer@homeassist.pk',
      passwordHash: await bcrypt.hash('customer123', 10),
      phone: '0333-1111111',
      location: 'Lahore',
    },
  });

  console.log('Created admin and demo customer');

  const createdProviders = [];
  for (const pd of providerData) {
    const user = await prisma.user.create({
      data: {
        role: 'provider',
        name: pd.name,
        email: pd.email,
        passwordHash: await bcrypt.hash('provider123', 10),
        phone: pd.phone,
        location: pd.location,
      },
    });

    const provider = await prisma.provider.create({
      data: {
        userId: user.id,
        bio: pd.bio,
        experienceYears: pd.experienceYears,
        serviceArea: pd.serviceArea,
        isVerified: pd.isVerified,
        avgRating: pd.avgRating,
        reviewCount: pd.reviewCount,
        profilePhoto: pd.profilePhoto,
      },
    });

    for (const svc of pd.services) {
      const cat = createdCategories[svc.slug];
      if (cat) {
        await prisma.providerService.create({
          data: {
            providerId: provider.id,
            categoryId: cat.id,
            title: svc.title,
            price: svc.price,
            priceUnit: svc.priceUnit,
          },
        });
      }
    }

    for (const slot of pd.availability) {
      await prisma.availabilitySlot.create({
        data: { providerId: provider.id, ...slot },
      });
    }

    createdProviders.push({ provider, user });
  }
  console.log(`Created ${providerData.length} providers`);

  // Seed sample bookings and reviews
  const providerService = await prisma.providerService.findFirst({
    where: { provider: { userId: createdProviders[0].user.id } },
  });

  if (providerService) {
    const booking = await prisma.booking.create({
      data: {
        customerId: customerUser.id,
        providerId: createdProviders[0].provider.id,
        serviceId: providerService.id,
        status: 'completed',
        scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        address: 'House 12, Block B, Gulberg III, Lahore',
        problemDescription: 'Kitchen tap leaking, water dripping constantly.',
      },
    });

    await prisma.review.create({
      data: {
        bookingId: booking.id,
        providerId: createdProviders[0].provider.id,
        rating: 5,
        comment: reviewComments[0],
      },
    });
  }

  console.log('Seeding complete!');
  console.log('\nDemo accounts:');
  console.log('  Admin:    admin@homeassist.pk    / admin123');
  console.log('  Customer: customer@homeassist.pk / customer123');
  console.log('  Provider: ahmed@example.com      / provider123');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
