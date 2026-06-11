const paypal = require('@paypal/checkout-server-sdk')

function environment() {

    return new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
}

const client = new paypal.core.PayPalHttpClient(environment());

exports.createOrder = async (req, res) => {

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
            reference_id: booking_id.toString(),
            amount:{
                currency_code: 'KSH',
                value: amount.toString()
            }
        }]
    });
    try {
        const order = await client.execute(request);
        res.json(order.result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

exports.captureOrder = async (req, res) => {

    try {
        const {orderID} = req.body;
        const request = new paypal.orders.OrdersCaptureRequest(orderID);

        request.requestBody({});

        const capture = await client.execute(request);

        res.json(capture.result);
    }

    catch(error) {

        res.status(500).json({
            message:error.message
        });
    }
};