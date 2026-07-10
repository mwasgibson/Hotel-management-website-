const axios = require('axios');

exports.getAccessToken = async (req, res) => {

    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    try {
        const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching access token:', error);
        res.status(500).json({ error: 'Failed to fetch access token' });
    }
    return response.data.access_token;
};

exports.stkPush = async (req, res) => {

    try {
        const token = await exports.getAccessToken(req, res);
        const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
        const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');
        const response = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
            "BusinessShortCode": process.env.MPESA_SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "PartyA": req.body.phoneNumber,
            "PartyB": process.env.MPESA_SHORTCODE,
            "PhoneNumber": req.body.phoneNumber,
            "AccountReference": req.body.accountReference,
            "TransactionDesc": req.body.transactionDesc
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error performing STK push:', error);
        res.status(500).json({ error: 'Failed to perform STK push' });
    }
};

exports.callback = (req, res) => {
    const json = JSON.stringify(req.body, null, 2);
    console.log(json, req.body);
    res.json({ message: 'Callback received' });
};