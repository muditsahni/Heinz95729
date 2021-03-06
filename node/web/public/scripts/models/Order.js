Hilary.scope('heinz').register({
    name: 'Order',
    singleton: true,
    dependencies: ['router', 'ko', 'Blueprint', 'exceptions'],
    factory: function (router, ko, Blueprint, exceptions) {
        'use strict';

        var blueprint,
            Order,
            OrderItem;

        // email is not required when the order is with an orderid
        blueprint = new Blueprint({
            order_id: {
                type: 'string',
                required: false
            },
            email: {
                type: 'string',
                required: false
            },
            items: {
                type: 'array',
                required: false
            }
        });

        // single order item
        var OrderItem = function(orderItem) {
            var self = this;
            self.title = ko.observable(orderItem.title);
            self.price = ko.observable(orderItem.price);
            self.quantity = ko.observable(orderItem.quantity);
            self.url=ko.observable(orderItem.url);

            // supported operations: subtotal price of a single item
            self.subtotal = ko.pureComputed(function() {
                return self.price() * self.quantity();
            });

        };

        Order = function (order) {
            var self = {};

            if (!blueprint.syncSignatureMatches(order).result) {
                exceptions.throwArgumentException('An order argument is required to create a new Order', 'order', blueprint.syncSignatureMatches(order).errors);
                return;
            }

            order = order || {};

            self.order_id = ko.observable(order.order_id);
            self.email = ko.observable(order.email);
          	self.items = ko.observableArray();
            // self.isCompleted = ko.observable(order.isCompleted);

            // initialize order items
            var i;
            for (i = 0; i < order.items.length; i += 1) {
                self.items.push(new OrderItem(order.items[i]));
            }

            // helper function to format output
            self.formatCurrency = function (value) {
                return "$"+value.toFixed(2);
            }

            // operation: compute total order value
            self.total = ko.pureComputed(function() {
                var total = 0;
                $.each(self.items(), function() { total += this.subtotal() });
                // Don't want too many digits, ceil it
                // 1.74444 => 1.75
                // 1.005 => 1.01
                // 9.1 => 9.1
                return Math.ceil(total * 100) / 100;

            });

            self.totalQuantity = ko.pureComputed(function() {
                var total = 0;
                $.each(self.items(), function() { total += Number(this.quantity()) });
                console.log("total quantity:" +total );

                var cart = document.getElementById("cart-count");
                var vm = ko.contextFor(cart);
                vm.$data.cartCount(total);

                return total;

            });
            // operation: remove an item
            self.removeItem = function(item) {
                self.items.remove(item);
            };

            // operation: save order
            self.saveOrder = function() {

                console.log("save order callled!");

                // send updated order as JSON
                var dataToSave = {
                    email: self.email(),
                    items:
                        $.map(self.items(), function(item) {
                            return {
                                title: item.title(),
                                price: item.price(),
                                url: item.url(),
                                quantity: item.quantity()

                            }
                        }),
                    total_quantity: self.totalQuantity()
                    // isCompleted: self.isCompleted()
                };

                router.post("/saveOrder", dataToSave);

            };

            // operation: submit order
            self.submitOrder = function() {

                console.log("submit order callled!");

                console.log(self.total());

                // send updated order as JSON
                var dataToSubmit = {
                    "totalValue": self.total(),
                    "order": {
                        email: self.email(),
                        items:
                            $.map(self.items(), function(item) {
                                return {
                                    title: item.title(),
                                    price: item.price(),
                                    url: item.url(),
                                    quantity: item.quantity()

                                }
                            }),
                        // isCompleted: self.isCompleted()
                        total_quantity: self.totalQuantity()
                    }
                };

                router.post("/submitOrder", dataToSubmit);

            };

            return self;
        };

        return Order;

    }
});
