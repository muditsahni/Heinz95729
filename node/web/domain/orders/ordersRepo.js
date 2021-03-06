module.exports.name = 'ordersRepo';
module.exports.singleton = true;
//module.exports.blueprint = ['repoBlueprint'];
module.exports.dependencies = ['db', 'Order', 'Blueprint', 'exceptions', 'is'];
module.exports.factory = function (db, Order, Blueprint, exceptions, is) {
    'use strict';

    var self = {
            get: undefined,
            find: undefined,
            create: undefined,
            update: undefined,
            remove: undefined,
            updateCart: undefined,
            getCount: undefined
        },
        collection = db.collection(Order.db.collection),
        findOptionsBlueprint,
        i;

    // ensure the indexes exist
    for (i = 0; i < Order.db.indexes.length; i += 1) {
        collection.createIndex(Order.db.indexes[i].keys, Order.db.indexes[i].options);
    }

    findOptionsBlueprint = new Blueprint({
        query: 'object',
        skip: {
            type: 'number',
            required: false
        },
        limit: {
            type: 'number',
            required: false
        }
    });

    /*
    // Get a single order
    */
    self.get = function (email, callback) {
        if (is.not.string(email)) {
            exceptions.throwArgumentException('', 'email');
            return;
        }

        if (is.not.function(callback)) {
            exceptions.throwArgumentException('', 'callback');
            return;
        }

        collection.find({ email: email }).limit(1).next(function (err, order) {
            if (err) {
                callback(err);
                return;
            }

            callback(null, new Order(order));
        });
    };

    /*
    // Find order(s)
    */
    self.find = function (options, callback) {
        // Since options is an object, we can use Blueprint to validate it.
        if (!findOptionsBlueprint.syncSignatureMatches(options).result) {
            exceptions.throwArgumentException('', 'options', findOptionsBlueprint.syncSignatureMatches(options).errors);
            return;
        }

        // But we'll make sure a callback function was provided, by hand
        if (is.not.function(callback)) {
            exceptions.throwArgumentException('', 'callback');
            return;
        }

        // Set default skip and limit values if they weren't set
        var skip = options.skip || 0,
            limit = options.limit || 20;

        // This uses mongodb's find feature to obtain multiple documents,
        // although it still limits the result set. `find`, `skip`, and `limit`
        // return promises, so the query isn't executed until `toArray` is
        // called. It receives a callback function so it can perform the
        // IO asynchronously, and free up the event-loop, while it's waiting.
        collection.find(options.query).skip(skip).limit(limit).toArray(function (err, docs) {
            var orders = [], i;

            if (err) {
                callback(err);
                return;
            }

            for (i = 0; i < docs.length; i += 1) {
                orders.push(new Order(docs[i]));
            }

            callback(null, orders);
        });
    };
    self.remove = function (email, callback) {
        // Since options is an object, we can use Blueprint to validate it.

        if (is.not.object({"email":email})) {
            exceptions.throwArgumentException('', 'email');
            return;
        }
        // But we'll make sure a callback function was provided, by hand
        if (is.not.function(callback)) {
            exceptions.throwArgumentException('', 'callback');
            return;
        }


        // This uses mongodb's find feature to obtain multiple documents,
        // although it still limits the result set. `find`, `skip`, and `limit`
        // return promises, so the query isn't executed until `toArray` is
        // called. It receives a callback function so it can perform the
        // IO asynchronously, and free up the event-loop, while it's waiting.
        collection.deleteOne({"email": email}, callback);
    };

    /*
    // Update an order
    */
    self.update = function (email, payload, callback) {

        console.log("orders db update get called!");

        if (is.not.object({"email":email})) {
            exceptions.throwArgumentException('', 'email');
            return;
        }

        if (is.not.object(payload)) {
            exceptions.throwArgumentException('', 'payload');
            return;
        }

        if (is.not.function(callback)) {
            exceptions.throwArgumentException('', 'callback');
            return;
        }

        // actually replace an order
        collection.replaceOne({"email": email}, payload, callback);
    };

    self.updateCart = function (email, payload, callback) {

        console.log("orders db updateCart get called!");
        if (is.not.object({"email":email})) {
            exceptions.throwArgumentException('', 'email');
            return;
        }

        if (is.not.object(payload)) {
            exceptions.throwArgumentException('', 'payload');
            return;
        }

        if (is.not.function(callback)) {
            exceptions.throwArgumentException('', 'callback');
            return;
        }
        // actually replace an order
        collection.findAndModify({"email": email},[],{$setOnInsert: { "email": email} },{ upsert:true}, callback);
        collection.update( {"email" : email, "items.title" : payload.title },{$inc : {"items.$.quantity" : 1, "total_quantity" : 1}} ,{upsert:false }, callback);
        collection.update({email : email , "items.title" : { $ne : payload.title}},
                    {$addToSet : {"items" : {"title" : payload.title, "price" : payload.price ,"url" : payload.url , "quantity" : 1 }},$inc : {"total_quantity" : 1}},
                           {upsert:false}, callback);
    };

    self.merge = function(email1,callback) {
      //collection.findAndModify({"email": "Guest"},[],{$set:{ "email": email1 }},{ upsert:true}, callback);
      collection.find({ email: "Guest" }).limit(1).next(function (err, order) {
          if (err) {
              callback(err);
              return;
          }
          console.log("Array testttttt: "+order);
          if(order == null) {
            // The guest doesn't have any item in his cart
            callback(false);
            return;
          }

          var result = new Order(order);
          console.log("Array: "+JSON.stringify(result.items));
          var itemsArray = result.items;
          var total = result.total_quantity;
          console.log("title at index 0: "+itemsArray[0].title);
          console.log("title at index 0: "+itemsArray[0].quantity);
          console.log("title at index 0: "+order.total_quantity);
          collection.find({ email: email1 }).limit(1).next(function (err, order1) {
              if (err) {
                  callback(err);
                  return;
                }
                  if (order1 == null)
                  {

                    collection.update({"email": email1},{"email": email1, "items": order.items},{upsert:true}, callback);
                    collection.update( {"email" : email1 },{$inc : {"total_quantity" : order.total_quantity}} ,{upsert:false }, callback);
                    collection.deleteOne({"email": "Guest"}, callback);
                    callback(null, new Order(order));
                  }
                  else {

                    for (var i in itemsArray)
                    {
                      collection.update( {"email" : email1, "items.title" : itemsArray[i].title },{$inc : {"items.$.quantity" : itemsArray[i].quantity}} ,{upsert:false }, callback);
                      collection.update({"email" : email1 , "items.title" : { $ne : itemsArray[i].title}},
                                  {$addToSet : {"items" : {"title" : itemsArray[i].title, "price" : itemsArray[i].price ,"url" : itemsArray[i].url , "quantity" : itemsArray[i].quantity }}},
                                         {upsert:false}, callback);
                    }
                    collection.update( {"email" : email1 },{$inc : {"total_quantity" : order.total_quantity}} ,{upsert:false }, callback);
                    collection.deleteOne({"email": "Guest"}, callback);
                    callback(null, new Order(order));
                  }
              });

      });
    };
    self.getCount = function (email,callback) {
        if (is.not.string(email)) {
            exceptions.throwArgumentException('', 'payload');
            return;
        }

        if (is.not.function(callback)) {
            exceptions.throwArgumentException('', 'callback');
            return;
        }

        collection.find({"email" : email}).next (function (err, doc) {
            if (err) {
                callback(err);
                return;
            }
            callback(null, doc);
        });
    };
    return self;
};
