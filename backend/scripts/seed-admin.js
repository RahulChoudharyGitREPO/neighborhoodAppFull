/**
 * Seed script: Set a user as admin and populate some sample data
 * Usage: node scripts/seed-admin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../src/config/env');

const User = require('../src/models/User');
const UserContact = require('../src/models/UserContact');
const Request = require('../src/models/Request');
const Offer = require('../src/models/Offer');

const ADMIN_EMAIL = 'kamalrajacoc@gmail.com';
const ADMIN_PASSWORD = '12345678';

// Bokaro coordinates (from the screenshot)
const BOKARO_CENTER = [86.1511, 23.6693]; // [lng, lat]

const sampleRequests = [
  {
    title: 'Need help with grocery shopping',
    details: 'I need someone to pick up groceries from the local market. List includes vegetables, milk, and bread.',
    category: 'errands',
    whenTime: new Date(Date.now() + 4 * 3600000),
    location: { type: 'Point', coordinates: [86.1450, 23.6720] },
  },
  {
    title: 'Plumbing repair needed',
    details: 'Kitchen sink is leaking. Need a skilled person to fix the pipe joint. Tools available at home.',
    category: 'repairs',
    whenTime: new Date(Date.now() + 24 * 3600000),
    location: { type: 'Point', coordinates: [86.1580, 23.6650] },
  },
  {
    title: 'Math tutoring for Class 10',
    details: 'Looking for someone to help my child with math homework, especially algebra and geometry topics.',
    category: 'tutoring',
    whenTime: new Date(Date.now() + 48 * 3600000),
    location: { type: 'Point', coordinates: [86.1400, 23.6750] },
  },
  {
    title: 'Help moving furniture',
    details: 'Moving to a new flat nearby. Need 2-3 people to help carry sofa, bed, and dining table.',
    category: 'moving',
    whenTime: new Date(Date.now() + 72 * 3600000),
    location: { type: 'Point', coordinates: [86.1600, 23.6700] },
  },
  {
    title: 'Garden cleanup and maintenance',
    details: 'Overgrown garden needs trimming, weeding, and general cleanup. About 500 sq ft area.',
    category: 'gardening',
    whenTime: new Date(Date.now() + 96 * 3600000),
    location: { type: 'Point', coordinates: [86.1530, 23.6680] },
  },
];

const sampleOffers = [
  {
    skills: ['plumbing', 'electrical', 'carpentry'],
    radiusKm: 5,
    isActive: true,
    home: { type: 'Point', coordinates: [86.1520, 23.6710] },
  },
  {
    skills: ['tutoring', 'math', 'science'],
    radiusKm: 3,
    isActive: true,
    home: { type: 'Point', coordinates: [86.1480, 23.6660] },
  },
  {
    skills: ['driving', 'errands', 'delivery'],
    radiusKm: 5,
    isActive: true,
    home: { type: 'Point', coordinates: [86.1560, 23.6730] },
  },
];

const helperUsers = [
  { displayName: 'Suresh Kumar', email: 'suresh@example.com', role: 'helper', skills: ['plumbing', 'electrical', 'carpentry'] },
  { displayName: 'Priya Singh', email: 'priya@example.com', role: 'helper', skills: ['tutoring', 'math', 'science'] },
  { displayName: 'Amit Sharma', email: 'amit@example.com', role: 'helper', skills: ['driving', 'errands', 'delivery'] },
];

const requesterUsers = [
  { displayName: 'Deepak Verma', email: 'deepak@example.com', role: 'requester' },
  { displayName: 'Meena Devi', email: 'meena@example.com', role: 'requester' },
];

async function seed() {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('Connected to MongoDB');

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

    // 1. Set admin user (create if not exists)
    let adminUser = await User.findOne({ email: ADMIN_EMAIL });
    if (adminUser) {
      adminUser.role = 'admin';
      await adminUser.save();
      console.log(`Updated ${ADMIN_EMAIL} to admin role`);
    } else {
      adminUser = await User.create({
        displayName: 'Kamal Raja',
        email: ADMIN_EMAIL,
        role: 'admin',
        home: { type: 'Point', coordinates: BOKARO_CENTER },
        address: 'Bokaro Steel City, Jharkhand',
        radiusKm: 5,
        skills: ['management', 'tech'],
      });
      console.log(`Created admin user: ${ADMIN_EMAIL}`);
    }
    // Ensure UserContact exists for admin
    let adminContact = await UserContact.findOne({ userId: adminUser._id });
    if (!adminContact) {
      await UserContact.create({
        userId: adminUser._id,
        primaryEmail: ADMIN_EMAIL,
        passwordHash: ADMIN_PASSWORD, // Will be hashed by pre-save hook
      });
      console.log(`Created UserContact for admin: ${ADMIN_EMAIL}`);
    } else {
      console.log(`UserContact already exists for admin: ${ADMIN_EMAIL}`);
    }

    // 2. Create helper users (skip if already exist)
    const createdHelpers = [];
    for (const h of helperUsers) {
      let existing = await User.findOne({ email: h.email });
      if (!existing) {
        existing = await User.create({
          ...h,
          home: { type: 'Point', coordinates: [BOKARO_CENTER[0] + (Math.random() - 0.5) * 0.02, BOKARO_CENTER[1] + (Math.random() - 0.5) * 0.02] },
          address: 'Bokaro Steel City',
          radiusKm: 5,
        });
        console.log(`Created helper: ${h.displayName}`);
      } else {
        console.log(`Helper already exists: ${h.displayName}`);
      }
      // Ensure UserContact exists for helper
      let helperContact = await UserContact.findOne({ userId: existing._id });
      if (!helperContact) {
        await UserContact.create({
          userId: existing._id,
          primaryEmail: h.email,
          passwordHash: ADMIN_PASSWORD,
        });
        console.log(`Created UserContact for: ${h.displayName}`);
      }
      createdHelpers.push(existing);
    }

    // 3. Create requester users (skip if already exist)
    const createdRequesters = [];
    for (const r of requesterUsers) {
      let existing = await User.findOne({ email: r.email });
      if (!existing) {
        existing = await User.create({
          ...r,
          home: { type: 'Point', coordinates: [BOKARO_CENTER[0] + (Math.random() - 0.5) * 0.02, BOKARO_CENTER[1] + (Math.random() - 0.5) * 0.02] },
          address: 'Bokaro Steel City',
          radiusKm: 5,
        });
        console.log(`Created requester: ${r.displayName}`);
      } else {
        console.log(`Requester already exists: ${r.displayName}`);
      }
      // Ensure UserContact exists for requester
      let reqContact = await UserContact.findOne({ userId: existing._id });
      if (!reqContact) {
        await UserContact.create({
          userId: existing._id,
          primaryEmail: r.email,
          passwordHash: ADMIN_PASSWORD,
        });
        console.log(`Created UserContact for: ${r.displayName}`);
      }
      createdRequesters.push(existing);
    }

    // 4. Create sample requests (only if none exist for these users)
    const allRequesters = [...createdRequesters, adminUser];
    for (let i = 0; i < sampleRequests.length; i++) {
      const owner = allRequesters[i % allRequesters.length];
      const existingReq = await Request.findOne({ userId: owner._id, title: sampleRequests[i].title });
      if (!existingReq) {
        await Request.create({
          ...sampleRequests[i],
          userId: owner._id,
          status: 'open',
        });
        console.log(`Created request: "${sampleRequests[i].title}" by ${owner.displayName}`);
      } else {
        console.log(`Request already exists: "${sampleRequests[i].title}"`);
      }
    }

    // 5. Create sample offers (only if none exist for these helpers)
    for (let i = 0; i < sampleOffers.length; i++) {
      const helper = createdHelpers[i];
      const existingOffer = await Offer.findOne({ userId: helper._id });
      if (!existingOffer) {
        await Offer.create({
          ...sampleOffers[i],
          userId: helper._id,
        });
        console.log(`Created offer for: ${helper.displayName}`);
      } else {
        console.log(`Offer already exists for: ${helper.displayName}`);
      }
    }

    console.log('\nSeed complete!');
    console.log(`Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log('Sample helpers: Suresh Kumar, Priya Singh, Amit Sharma');
    console.log('Sample requesters: Deepak Verma, Meena Devi');
    console.log(`Total requests created: up to ${sampleRequests.length}`);
    console.log(`Total offers created: up to ${sampleOffers.length}`);

  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed();
