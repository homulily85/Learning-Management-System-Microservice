import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

// --- SCHEMA DEFINITIONS ---
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    subscription: { id: String, status: { type: String, default: 'inactive' } },
    avatar: { public_id: String, secure_url: String },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' }
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
    razorpay_payment_id: { type: String, required: true },
    razorpay_subscription_id: { type: String, required: true },
    razorpay_signature: { type: String, required: true }
}, { timestamps: true });

const courseSchema = new mongoose.Schema({
    title: String,
    description: String,
    category: String,
    thumbnail: { public_id: String, secure_url: String },
    lectures: [{ title: String, description: String, lecture: { public_id: String, secure_url: String } }],
    numberOfLectures: { type: Number, default: 0 },
    createdBy: String
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Course = mongoose.model('Course', courseSchema);

const MONGO_URI = 'mongodb://127.0.0.1:27017/lms_micro'; 

const runSeeder = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("🚀 Connected to lms_micro...");

        await User.deleteMany({});
        await Payment.deleteMany({});
        await Course.deleteMany({});

        const hashedPassword = await bcrypt.hash('password123', 10);

        // 1. CREATE ADMIN
        await User.create({
            fullName: 'Nguyen Admin',
            email: 'admin@gmail.com',
            password: hashedPassword,
            role: 'ADMIN',
            subscription: { id: 'sub_admin', status: 'active' },
            avatar: { public_id: 'v1', secure_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' }
        });

        // 2. CREATE 10 USERS
        const users = [];
        for (let i = 0; i < 10; i++) {
            users.push({
                fullName: faker.person.fullName(),
                email: faker.internet.email().toLowerCase(),
                password: hashedPassword,
                role: 'USER',
                subscription: { id: `sub_${faker.string.alphanumeric(5)}`, status: 'active' },
                avatar: { public_id: 'v1', secure_url: faker.image.avatar() }
            });
        }
        await User.insertMany(users);

        // 3. CREATE 10 COURSES
        for (let i = 1; i <= 10; i++) {
            await Course.create({
                title: `Course ${faker.commerce.productName()}`,
                description: `Description for course ${i}`,
                category: 'Web Dev',
                thumbnail: { public_id: 't1', secure_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500' },
                lectures: [
                    { title: 'Intro', description: 'Welcome', lecture: { public_id: 'v1', secure_url: 'url' } }
                ],
                numberOfLectures: 1,
                createdBy: 'Nguyen Admin'
            });
        }

        // 4. CREATE 100 PAYMENTS (For Charts)
        const payments = [];
        for (let i = 0; i < 100; i++) {
            payments.push({
                razorpay_payment_id: `pay_${faker.string.alphanumeric(10)}`,
                razorpay_subscription_id: `sub_${faker.string.alphanumeric(10)}`,
                razorpay_signature: 'sig_mock',
                createdAt: faker.date.past({ years: 1 })
            });
        }
        await Payment.insertMany(payments);

        console.log("✅ Database Seeded Successfully!");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
runSeeder();