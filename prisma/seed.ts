import 'dotenv/config';
import { PrismaClient, Role, ActivityStatus, Visibility, MediaType, Weekday } from '../src/generated/prisma';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Starting comprehensive database seed for 42nd HAPUA Council Meeting...');

  // 1. Seed Admin User
  const adminEmail = 'admin@hapua.org';
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.delegation.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      role: Role.ADMIN,
    },
    create: {
      firstName: 'System',
      lastName: 'Admin',
      email: adminEmail,
      password: hashedPassword,
      role: Role.ADMIN,
      position: 'Executive Secretariat Administrator',
      title: 'Mr.',
      delegationCode: 'HAP-ADMIN',
    },
  });
  console.log(`✅ Admin user ready: ${admin.email} (Password: admin123)`);

  // 2. Seed ASEAN Countries
  const countriesData = [
    { name: 'Lao PDR', code: 'LA' },
    { name: 'Thailand', code: 'TH' },
    { name: 'Vietnam', code: 'VN' },
    { name: 'Malaysia', code: 'MY' },
    { name: 'Singapore', code: 'SG' },
    { name: 'Indonesia', code: 'ID' },
    { name: 'Philippines', code: 'PH' },
    { name: 'Cambodia', code: 'KH' },
    { name: 'Brunei Darussalam', code: 'BN' },
    { name: 'Myanmar', code: 'MM' },
  ];

  const countryMap: Record<string, string> = {};
  for (const c of countriesData) {
    const record = await prisma.country.upsert({
      where: { name: c.name },
      update: { code: c.code },
      create: c,
    });
    countryMap[c.code] = record.id;
  }
  console.log(`✅ Seeded ${countriesData.length} ASEAN countries.`);

  // 3. Seed Organizations (Power Utilities)
  const orgsData = [
    { name: 'Electricité du Laos', shortName: 'EDL' },
    { name: 'Electricity Generating Authority of Thailand', shortName: 'EGAT' },
    { name: 'Vietnam Electricity', shortName: 'EVN' },
    { name: 'Tenaga Nasional Berhad', shortName: 'TNB' },
    { name: 'PT PLN (Persero)', shortName: 'PLN' },
    { name: 'SP Group', shortName: 'SP' },
    { name: 'National Power Corporation / Meralco', shortName: 'NPC' },
    { name: 'Electricité du Cambodge', shortName: 'EDC' },
    { name: 'Department of Electrical Services Brunei', shortName: 'DESB' },
    { name: 'Yangon Electricity Supply Corporation', shortName: 'YESC' },
    { name: 'HAPUA Secretariat', shortName: 'HAPUA' },
  ];

  const orgMap: Record<string, string> = {};
  for (const o of orgsData) {
    const record = await prisma.organization.upsert({
      where: { name: o.name },
      update: { shortName: o.shortName },
      create: o,
    });
    if (o.shortName) {
      orgMap[o.shortName] = record.id;
    }
  }
  console.log(`✅ Seeded ${orgsData.length} Power Utility Organizations.`);

  // 4. Seed Meeting Rooms
  const roomsData = [
    {
      name: 'Mekong Plenary Grand Auditorium',
      location: 'Floor 1, Main Convention Hall',
      capacity: 600,
      description: 'Main assembly hall equipped with simultaneous 6-language translation and state broadcast video systems.',
      imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Heritage Grand Ballroom',
      location: 'Floor 2, East Wing',
      capacity: 500,
      description: 'Lao architectural banqueting ballroom designed for state banquets and cultural gala dinners.',
      imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Bilateral Suite Mekong 1',
      location: 'Floor 3, VIP Executive Suite',
      capacity: 40,
      description: 'Confidential bilateral suite for minister-level negotiations and cross-border PPA signings.',
      imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Committee Room A - Generation & Grid',
      location: 'Floor 2, North Wing',
      capacity: 100,
      description: 'Working Group 1 breakout room for renewable integration and cross-border interconnection modeling.',
      imageUrl: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Committee Room B - Reliability & Codes',
      location: 'Floor 2, South Wing',
      capacity: 100,
      description: 'Working Group 2 breakout room for grid standards, cybersecurity, and power reliability.',
      imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Innovation Hub Stage',
      location: 'Floor 1, West Gallery',
      capacity: 150,
      description: 'High-tech presentation auditorium for the ASEAN Youth Energy Forum and technology showcases.',
      imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    },
  ];

  const roomMap: Record<string, string> = {};
  for (const r of roomsData) {
    const existing = await prisma.room.findFirst({ where: { name: r.name } });
    if (!existing) {
      const created = await prisma.room.create({ data: r });
      roomMap[r.name] = created.id;
    } else {
      roomMap[r.name] = existing.id;
    }
  }
  console.log(`✅ Seeded ${roomsData.length} Meeting Rooms.`);

  // 5. Seed 5-Day Summit Activities & Sessions
  const activitiesData = [
    // Day 1: 2026-08-31
    {
      name: 'Delegate Registration & Accreditation Badge Collection',
      description: 'Check-in at LPQ Convention Center Hospitality Desk. Welcome kit and local 5G eSIM distribution.',
      date: new Date('2026-08-31'),
      startTime: new Date('2026-08-31T09:00:00Z'),
      endTime: new Date('2026-08-31T17:00:00Z'),
      status: ActivityStatus.UPCOMING,
      qrCode: 'ACT-REG-2026',
      roomName: 'Mekong Plenary Grand Auditorium',
    },
    {
      name: 'HAPUA Secretariat Heads Pre-Council Consultation',
      description: 'Closed-door preparatory session on multilateral power trading frameworks and committee reports.',
      date: new Date('2026-08-31'),
      startTime: new Date('2026-08-31T14:00:00Z'),
      endTime: new Date('2026-08-31T16:30:00Z'),
      status: ActivityStatus.UPCOMING,
      qrCode: 'ACT-PRE-COUNCIL',
      roomName: 'Bilateral Suite Mekong 1',
    },
    {
      name: 'Welcome Cocktail Reception & Cultural Showcase',
      description: 'Informal networking dinner hosted by Electricité du Laos (EDL) overlooking the Nam Khan River.',
      date: new Date('2026-08-31'),
      startTime: new Date('2026-08-31T18:30:00Z'),
      endTime: new Date('2026-08-31T21:00:00Z'),
      status: ActivityStatus.UPCOMING,
      qrCode: 'ACT-WELCOME-REC',
      roomName: 'Heritage Grand Ballroom',
    },

    // Day 2: 2026-09-01
    {
      name: '42nd HAPUA Council Official Opening Plenary',
      description: 'Keynote addresses by Lao PDR Ministry of Energy and Mines, ASEAN Secretary General, and HAPUA Council Chairman.',
      date: new Date('2026-09-01'),
      startTime: new Date('2026-09-01T09:00:00Z'),
      endTime: new Date('2026-09-01T11:30:00Z'),
      status: ActivityStatus.UPCOMING,
      qrCode: 'ACT-PLENARY-OPEN',
      roomName: 'Mekong Plenary Grand Auditorium',
    },
    {
      name: 'Ministerial High-Level Dialogue on Regional Grid Interconnection',
      description: 'Accelerating ASEAN Power Grid (APG) cross-border transmission lines and subsea cable interconnections.',
      date: new Date('2026-09-01'),
      startTime: new Date('2026-09-01T13:30:00Z'),
      endTime: new Date('2026-09-01T15:30:00Z'),
      status: ActivityStatus.UPCOMING,
      qrCode: 'ACT-MINISTERIAL-GRID',
      roomName: 'Mekong Plenary Grand Auditorium',
    },
    {
      name: 'Traditional Lao Baci Blessing Ceremony & Official Council Banquet',
      description: 'Centuries-old Luang Prabang ceremony conferring goodwill upon ASEAN delegates, followed by official banquet.',
      date: new Date('2026-09-01'),
      startTime: new Date('2026-09-01T18:30:00Z'),
      endTime: new Date('2026-09-01T21:30:00Z'),
      status: ActivityStatus.UPCOMING,
      qrCode: 'ACT-BACI-BANQUET',
      roomName: 'Heritage Grand Ballroom',
    },

    // Day 3: 2026-09-02
    {
      name: 'Working Group 1: Generation & Renewable Grid Integration',
      description: 'Strategies for solar, wind, and battery storage integration into national transmission backbones.',
      date: new Date('2026-09-02'),
      startTime: new Date('2026-09-02T09:00:00Z'),
      endTime: new Date('2026-09-02T12:00:00Z'),
      status: ActivityStatus.UPCOMING,
      qrCode: 'ACT-WG1-GEN',
      roomName: 'Committee Room A - Generation & Grid',
    },
    {
      name: 'Working Group 2: Transmission & Reliability Standards',
      description: 'Harmonization of grid codes and cybersecurity standards for cross-border power flows.',
      date: new Date('2026-09-02'),
      startTime: new Date('2026-09-02T09:00:00Z'),
      endTime: new Date('2026-09-02T12:00:00Z'),
      status: ActivityStatus.UPCOMING,
      qrCode: 'ACT-WG2-TRANS',
      roomName: 'Committee Room B - Reliability & Codes',
    },
    {
      name: 'ASEAN Youth Energy Leadership Forum & Pitch Day',
      description: 'Selected young researchers and innovators present clean energy solutions to utility CEOs.',
      date: new Date('2026-09-02'),
      startTime: new Date('2026-09-02T14:00:00Z'),
      endTime: new Date('2026-09-02T17:00:00Z'),
      status: ActivityStatus.UPCOMING,
      qrCode: 'ACT-YOUTH-INNOV',
      roomName: 'Innovation Hub Stage',
    },

    // Day 4: 2026-09-03
    {
      name: 'Technical Site Tour: Nam Ou River Hydroelectric Complex',
      description: 'Field visit to state-of-the-art run-of-river clean power generation facility and fish passage system.',
      date: new Date('2026-09-03'),
      startTime: new Date('2026-09-03T08:30:00Z'),
      endTime: new Date('2026-09-03T14:00:00Z'),
      status: ActivityStatus.UPCOMING,
      qrCode: 'ACT-NAMOU-HYDRO',
      roomName: undefined,
    },
    {
      name: 'Luang Prabang UNESCO Heritage & Sunset Cruise',
      description: 'Guided tour of Wat Xieng Thong followed by networking cruise along the Upper Mekong River.',
      date: new Date('2026-09-03'),
      startTime: new Date('2026-09-03T16:00:00Z'),
      endTime: new Date('2026-09-03T19:30:00Z'),
      status: ActivityStatus.UPCOMING,
      qrCode: 'ACT-SUNSET-CRUISE',
      roomName: undefined,
    },

    // Day 5: 2026-09-04
    {
      name: 'Adoption of Joint Declaration & HAPUA 2026 Communiqué',
      description: 'Formal sign-off by Heads of ASEAN Power Utilities on the 5-Year Regional Action Plan.',
      date: new Date('2026-09-04'),
      startTime: new Date('2026-09-04T09:30:00Z'),
      endTime: new Date('2026-09-04T12:00:00Z'),
      status: ActivityStatus.UPCOMING,
      qrCode: 'ACT-COMMUNIQUE',
      roomName: 'Mekong Plenary Grand Auditorium',
    },
    {
      name: 'Handover Ceremony to the 43rd HAPUA Council Host & Press Briefing',
      description: 'Official transition of HAPUA rotating chairmanship and closing international press conference.',
      date: new Date('2026-09-04'),
      startTime: new Date('2026-09-04T13:30:00Z'),
      endTime: new Date('2026-09-04T15:30:00Z'),
      status: ActivityStatus.UPCOMING,
      qrCode: 'ACT-HANDOVER-CLOSING',
      roomName: 'Mekong Plenary Grand Auditorium',
    },
  ];

  const createdActivities: any[] = [];
  for (const act of activitiesData) {
    const roomId = act.roomName ? roomMap[act.roomName] : null;
    const existing = await prisma.activity.findFirst({ where: { qrCode: act.qrCode } });
    if (!existing) {
      const created = await prisma.activity.create({
        data: {
          name: act.name,
          description: act.description,
          date: act.date,
          startTime: act.startTime,
          endTime: act.endTime,
          status: act.status,
          qrCode: act.qrCode,
          roomId: roomId || undefined,
        },
      });
      createdActivities.push(created);
    } else {
      createdActivities.push(existing);
    }
  }
  console.log(`✅ Seeded ${activitiesData.length} 5-Day Summit Activities.`);

  // 6. Seed ASEAN Delegates with Unique Codes
  const delegatesData = [
    {
      title: 'H.E.',
      firstName: 'Chanthaboun',
      lastName: 'Soukaloun',
      email: 'chanthaboun.s@edl.la',
      phoneNumber: '+856 20 5551 2345',
      position: 'Managing Director, Electricité du Laos',
      delegationCode: 'HAP-LA-001',
      countryCode: 'LA',
      orgShort: 'EDL',
    },
    {
      title: 'Dr.',
      firstName: 'Prasert',
      lastName: 'Sinsukprasert',
      email: 'prasert.s@egat.co.th',
      phoneNumber: '+66 81 234 5678',
      position: 'Governor, Electricity Generating Authority of Thailand',
      delegationCode: 'HAP-TH-001',
      countryCode: 'TH',
      orgShort: 'EGAT',
    },
    {
      title: 'Mr.',
      firstName: 'Tran Dinh',
      lastName: 'Nhan',
      email: 'nhantd@evn.com.vn',
      phoneNumber: '+84 90 345 6789',
      position: 'President & CEO, Vietnam Electricity',
      delegationCode: 'HAP-VN-001',
      countryCode: 'VN',
      orgShort: 'EVN',
    },
    {
      title: 'Dato\' Seri Ir.',
      firstName: 'Baharin',
      lastName: 'Din',
      email: 'baharindin@tnb.com.my',
      phoneNumber: '+60 12 345 6789',
      position: 'President / CEO, Tenaga Nasional Berhad',
      delegationCode: 'HAP-MY-001',
      countryCode: 'MY',
      orgShort: 'TNB',
    },
    {
      title: 'Mr.',
      firstName: 'Darmawan',
      lastName: 'Prasodjo',
      email: 'darmawan.p@pln.co.id',
      phoneNumber: '+62 811 234 5678',
      position: 'President Director, PT PLN (Persero)',
      delegationCode: 'HAP-ID-001',
      countryCode: 'ID',
      orgShort: 'PLN',
    },
    {
      title: 'Mr.',
      firstName: 'Stanley',
      lastName: 'Huang',
      email: 'stanleyhuang@spgroup.com.sg',
      phoneNumber: '+65 9123 4567',
      position: 'Group CEO, SP Group Singapore',
      delegationCode: 'HAP-SG-001',
      countryCode: 'SG',
      orgShort: 'SP',
    },
    {
      title: 'H.E.',
      firstName: 'Keo',
      lastName: 'Rottanak',
      email: 'keo.rottanak@edc.com.kh',
      phoneNumber: '+855 12 345 678',
      position: 'Managing Director, Electricité du Cambodge',
      delegationCode: 'HAP-KH-001',
      countryCode: 'KH',
      orgShort: 'EDC',
    },
    {
      title: 'Mr.',
      firstName: 'Emmanuel',
      lastName: 'Rubio',
      email: 'emmanuel.rubio@meralco.com.ph',
      phoneNumber: '+63 917 123 4567',
      position: 'President & CEO, NPC / Meralco Delegation',
      delegationCode: 'HAP-PH-001',
      countryCode: 'PH',
      orgShort: 'NPC',
    },
    {
      title: 'Mr.',
      firstName: 'Mohamad Irwan',
      lastName: 'Haji Ramlee',
      email: 'irwan.ramlee@des.gov.bn',
      phoneNumber: '+673 876 5432',
      position: 'Director, Department of Electrical Services Brunei',
      delegationCode: 'HAP-BN-001',
      countryCode: 'BN',
      orgShort: 'DESB',
    },
    {
      title: 'Daw',
      firstName: 'Khin Khin',
      lastName: 'Aye',
      email: 'khinkhinaye@yesc.gov.mm',
      phoneNumber: '+95 9 1234 5678',
      position: 'Director General, Yangon Electricity Supply Corporation',
      delegationCode: 'HAP-MM-001',
      countryCode: 'MM',
      orgShort: 'YESC',
    },
  ];

  const createdDelegates: any[] = [];
  for (const d of delegatesData) {
    const countryId = countryMap[d.countryCode];
    const organizationId = orgMap[d.orgShort];
    const record = await prisma.delegation.upsert({
      where: { email: d.email },
      update: {
        position: d.position,
        delegationCode: d.delegationCode,
        countryId,
        organizationId,
      },
      create: {
        title: d.title,
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email,
        phoneNumber: d.phoneNumber,
        position: d.position,
        delegationCode: d.delegationCode,
        role: Role.DELEGATION,
        countryId,
        organizationId,
      },
    });
    createdDelegates.push(record);
  }
  console.log(`✅ Seeded ${delegatesData.length} ASEAN Delegates.`);

  // 7. Seed Activity Registrations (M2M Link)
  for (const del of createdDelegates) {
    for (const act of createdActivities.slice(0, 5)) {
      try {
        await prisma.activityDelegation.upsert({
          where: {
            activityId_delegationId: {
              activityId: act.id,
              delegationId: del.id,
            },
          },
          update: {},
          create: {
            activityId: act.id,
            delegationId: del.id,
          },
        });
      } catch {
        // ignore duplicate
      }
    }
  }
  console.log(`✅ Seeded Activity-Delegation registrations.`);

  // 8. Seed Hotel Recommendations
  const hotelsData = [
    {
      name: 'Amantaka Luang Prabang',
      description: 'Exclusive 5-star luxury resort set in historic French colonial grounds within walking distance of Phousi Hill and plenary venues.',
      address: '55/3 Kingkitsarath Road, Luang Prabang, Lao PDR',
      starRating: 5,
      contactInfo: '+856 71 860 333 | reservations@amantaka.com',
      coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      websiteUrl: 'https://www.aman.com/resorts/amantaka',
      mapUrl: 'https://maps.google.com/?q=Amantaka+Luang+Prabang',
    },
    {
      name: 'Rosewood Luang Prabang',
      description: 'Ultra-luxury riverside resort featuring riverside villas, waterfall dining, and private executive shuttle escorts to the summit hall.',
      address: 'Nauea Village, Luang Prabang, Lao PDR',
      starRating: 5,
      contactInfo: '+856 71 211 155 | luangprabang@rosewoodhotels.com',
      coverImage: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
      websiteUrl: 'https://www.rosewoodhotels.com/luang-prabang',
      mapUrl: 'https://maps.google.com/?q=Rosewood+Luang+Prabang',
    },
    {
      name: 'Sofitel Luang Prabang',
      description: 'Century-old heritage mansion with lush tropical gardens, presidential suites, and high-speed fiber diplomatic connectivity.',
      address: 'Ban Mano, Luang Prabang, Lao PDR',
      starRating: 5,
      contactInfo: '+856 71 260 777 | H9669@sofitel.com',
      coverImage: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
      websiteUrl: 'https://all.accor.com/hotel/9669/index.en.shtml',
      mapUrl: 'https://maps.google.com/?q=Sofitel+Luang+Prabang',
    },
    {
      name: 'Avani+ Luang Prabang Hotel',
      description: 'Modern neo-classical hotel in the heart of town with 25-meter pool and designated delegation concierge desk.',
      address: 'Setthathirath Road, Hua Xieng Village, Luang Prabang, Lao PDR',
      starRating: 5,
      contactInfo: '+856 71 262 333 | luangprabang@avanihotels.com',
      coverImage: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
      websiteUrl: 'https://www.avanihotels.com/en/luang-prabang',
      mapUrl: 'https://maps.google.com/?q=Avani+Luang+Prabang',
    },
    {
      name: 'Victoria Xiengthong Palace',
      description: 'Historic palace boutique hotel situated alongside Wat Xieng Thong with sweeping views of the Mekong river confluence.',
      address: 'Khem Khong, Ban Phoneheuang, Luang Prabang, Lao PDR',
      starRating: 4,
      contactInfo: '+856 71 213 200 | resa.xiengthong@victoriahotels.asia',
      coverImage: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
      websiteUrl: 'https://www.victoriahotels.asia',
      mapUrl: 'https://maps.google.com/?q=Victoria+Xiengthong+Palace',
    },
  ];

  for (const h of hotelsData) {
    const existing = await prisma.hotelRecommend.findFirst({ where: { name: h.name } });
    if (!existing) {
      await prisma.hotelRecommend.create({ data: h });
    }
  }
  console.log(`✅ Seeded ${hotelsData.length} Hotel Recommendations.`);

  // 9. Seed Travel Recommendations
  const travelData = [
    {
      placeName: 'Kuang Si Waterfalls',
      description: 'Three-tiered turquoise waterfall complex featuring travertine cascade pools, jungle trails, and the Tat Kuang Si Bear Rescue Centre.',
      location: '29 km South of Luang Prabang',
      openTime: new Date('1970-01-01T08:00:00Z'),
      closeTime: new Date('1970-01-01T17:30:00Z'),
      openDays: [Weekday.MONDAY, Weekday.TUESDAY, Weekday.WEDNESDAY, Weekday.THURSDAY, Weekday.FRIDAY, Weekday.SATURDAY, Weekday.SUNDAY],
      mapUrl: 'https://maps.google.com/?q=Kuang+Si+Waterfall',
      coverImage: 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=80',
    },
    {
      placeName: 'Wat Xieng Thong Royal Temple',
      description: 'The sweeping "Tree of Life" temple built in 1560, epitomizing classical Luang Prabang Buddhist architecture and royal coronation history.',
      location: 'Old Town Peninsula, Khem Khong',
      openTime: new Date('1970-01-01T06:00:00Z'),
      closeTime: new Date('1970-01-01T18:00:00Z'),
      openDays: [Weekday.MONDAY, Weekday.TUESDAY, Weekday.WEDNESDAY, Weekday.THURSDAY, Weekday.FRIDAY, Weekday.SATURDAY, Weekday.SUNDAY],
      mapUrl: 'https://maps.google.com/?q=Wat+Xieng+Thong',
      coverImage: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    },
    {
      placeName: 'Mount Phousi Sacred Viewpoint',
      description: 'Sacred 100m hill in the heart of town offering 360-degree panoramic sunset vistas across the Mekong and Nam Khan rivers.',
      location: 'Town Centre, Opposite Royal Palace',
      openTime: new Date('1970-01-01T06:00:00Z'),
      closeTime: new Date('1970-01-01T19:00:00Z'),
      openDays: [Weekday.MONDAY, Weekday.TUESDAY, Weekday.WEDNESDAY, Weekday.THURSDAY, Weekday.FRIDAY, Weekday.SATURDAY, Weekday.SUNDAY],
      mapUrl: 'https://maps.google.com/?q=Mount+Phousi',
      coverImage: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
    },
    {
      placeName: 'Pak Ou Sacred Caves (Tham Ting)',
      description: 'Dramatic limestone cave shrine containing over 4,000 revered Buddha statues overlooking the Upper Mekong River gorge.',
      location: '25 km North upstream along Mekong River',
      openTime: new Date('1970-01-01T08:00:00Z'),
      closeTime: new Date('1970-01-01T17:00:00Z'),
      openDays: [Weekday.MONDAY, Weekday.TUESDAY, Weekday.WEDNESDAY, Weekday.THURSDAY, Weekday.FRIDAY, Weekday.SATURDAY, Weekday.SUNDAY],
      mapUrl: 'https://maps.google.com/?q=Pak+Ou+Caves',
      coverImage: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
    },
  ];

  for (const t of travelData) {
    const existing = await prisma.travelRecommend.findFirst({ where: { placeName: t.placeName } });
    if (!existing) {
      await prisma.travelRecommend.create({ data: t });
    }
  }
  console.log(`✅ Seeded ${travelData.length} Travel Recommendations.`);

  // 10. Seed Gallery Photos
  if (createdActivities.length > 0) {
    const galleryItems = [
      {
        title: 'Opening Plenary Keynote Address',
        mediaUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
        mediaType: MediaType.IMAGE,
        visibility: Visibility.PUBLIC,
        description: 'Heads of ASEAN Power Utilities convene for the inaugural session in Luang Prabang.',
        activityId: createdActivities[0].id,
      },
      {
        title: 'Traditional Baci Blessing Ritual',
        mediaUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
        mediaType: MediaType.IMAGE,
        visibility: Visibility.PUBLIC,
        description: 'Lao cultural welcome and white thread blessing ceremony for international delegations.',
        activityId: createdActivities[2]?.id || createdActivities[0].id,
      },
      {
        title: 'Nam Ou Hydroelectric Cascade Inspection',
        mediaUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
        mediaType: MediaType.IMAGE,
        visibility: Visibility.PUBLIC,
        description: 'Engineering site visit to run-of-river clean power turbines and river ecology center.',
        activityId: createdActivities[3]?.id || createdActivities[0].id,
      },
    ];

    for (const g of galleryItems) {
      const existing = await prisma.gallery.findFirst({ where: { title: g.title } });
      if (!existing) {
        await prisma.gallery.create({ data: g });
      }
    }
    console.log(`✅ Seeded Gallery Media Items.`);
  }

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
