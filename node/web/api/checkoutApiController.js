module.exports.name = 'checkoutApiController';
module.exports.dependencies = ['router', 'ordersRepo', 'exceptions', 'stripe'];
module.exports.factory = function (router, repo, exceptions, stripe) {
    'use strict';

    // get order
    router.get('/api/checkout', function (req, res) {
        console.log("Oh!!!/api/checkout is called with req:\n");
        //console.log(req);

        // the query should return one order that's supposed to be not completed
        // but return all the orders for simplicity now?
        repo.find({ query: { email: req.cookies.email }}, function (err, orders) {
            if (err) {
                exceptions.throwException(err);
                res.status(400);
                return;
            }

            console.log("Oh!!!/api/checkout query db succeed!\n");

            res.send(orders);
        });
    });



    // save order
    router.post('/api/saveOrder', function (req, res) {

        console.log("a post to /api/saveOrder !!");

        repo.update(req.body.email, req.body, function (err, result) {
            if (!err) {
                res.send("Success");
            } else {
                res.send("Fail");
            }
        });

    });

    // submit order
    router.post('/api/submitOrder', function (req, res) {

        console.log("a post to /api/submitOrder !!");

        // currently only save the order, but
        // consider set a flag in the order table to indicate the order has
        // been submitted but the payment is pending
        repo.update(req.body.email, req.body, function (err, result) {
            if (!err) {
                res.send("Success");
            } else {
                res.send("Fail");
            }
        });

    });

    // payment
    // temporarily put it here
    router.post('/payment', function(req, res) {

        console.log("a post to /api/payment !!");

        var stripeToken = req.body.id;
        // unit: cent, thus the multiplication is needed
        var amount = req.body.amount * 100;

        console.log(stripeToken);
        // var amount = 1000; // unit: cent

        stripe.charges.create({
            card: stripeToken,
            currency: 'usd',
            amount: amount
        },
        function(err, charge) {
            if (err) {
                // send in data rather than status code
                res.send("500");
            } else {
                res.send("204");
            }
        });
    });


    return router;
};
