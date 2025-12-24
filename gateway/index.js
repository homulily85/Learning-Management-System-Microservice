const express = require('express');
const cors = require('cors');
const httpProxy = require('express-http-proxy');
const morgan = require('morgan');
const NodeCache = require('node-cache');
const statusMonitor = require('express-status-monitor')();
const errorMiddlware = require('./middlewares/error.middleware.js');

require('dotenv').config();

const app = express();
const myCache = new NodeCache({ stdTTL: 30 }); // Request Caching (30 giây)

-
app.use(statusMonitor); 
app.use(morgan('dev'));
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));

const proxyOptionsWithCache = {
    limit: '50mb',
    userResDecorator: function(proxyRes, proxyResData, userReq, userRes) {
        if (userReq.method === 'GET' && proxyRes.statusCode === 200) {
            myCache.set(userReq.originalUrl, proxyResData.toString());
            console.log(`[CACHE SET] Saved: ${userReq.originalUrl}`);
        }
        return proxyResData;
    }
};

const checkCache = (req, res, next) => {
    if (req.method !== 'GET') return next();
    const cachedData = myCache.get(req.originalUrl);
    if (cachedData) {
        console.log(`[CACHE HIT] Serving from cache: ${req.originalUrl}`);
        res.set('Content-Type', 'application/json');
        return res.send(cachedData);
    }
    next();
};


// API Course: Có Caching
app.use('/api/v1/course', checkCache, httpProxy(process.env.COURSE_SERVICE_URL, proxyOptionsWithCache));

app.use('/api/v1/user', httpProxy(process.env.USER_SERVICE_URL, { limit: '50mb' }));

app.use('/api/v1/payment', httpProxy(process.env.PAYMENT_SERVICE_URL, { limit: '50mb' }));
app.use('/api/v1/', httpProxy(process.env.MISC_SERVICE_URL, { limit: '50mb' }));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.all(/.*/, (_req, res) => {
    res.status(404).send('OOPS!! 404 page not found');
});

app.use(errorMiddlware);

app.listen(process.env.PORT, () => {
    console.log(`🚀 API Gateway (Chỉ Caching) chạy tại cổng ${process.env.PORT}`);
    console.log(`📊 Dashboard giám sát: http://localhost:${process.env.PORT}/status`);
});