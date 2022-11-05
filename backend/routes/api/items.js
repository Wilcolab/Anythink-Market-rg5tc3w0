var router = require("express").Router();
var mongoose = require("mongoose");
var Item = mongoose.model("Item");
var Comment = mongoose.model("Comment");
var User = mongoose.model("User");
var auth = require("../auth");
const { sendEvent } = require("../../lib/event");

// Preload item objects on routes with ':item'
router.param("item", function(req, res, next, slug) {
  Item.findOne({ slug: slug })
    .populate("seller")
    .then(function(item) {
      if (!item) {
        return res.sendStatus(404);
      }

      req.item = item;

      return next();
    })
    .catch(next);
});

router.param("comment", function(req, res, next, id) {
  Comment.findById(id)
    .then(function(comment) {
      if (!comment) {
        return res.sendStatus(404);
      }

      req.comment = comment;

      return next();
    })
    .catch(next);
});

router.get("/", auth.optional, function(req, res, next) {
  var query = {};
  var limit = 100;
  var offset = 0;

  if (typeof req.query.limit !== "undefined") {
    limit = req.query.limit;
  }

  if (typeof req.query.offset !== "undefined") {
    offset = req.query.offset;
  }

  if (typeof req.query.tag !== "undefined") {
    query.tagList = { $in: [req.query.tag] };
  }

  Promise.all([
    req.query.seller ? User.findOne({ username: req.query.seller }) : null,
    req.query.favorited ? User.findOne({ username: req.query.favorited }) : null
  ])
    .then(function(results) {
      var seller = results[0];
      var favoriter = results[1];

      if (seller) {
        query.seller = seller._id;
      }

      if (favoriter) {
        query._id = { $in: favoriter.favorites };
      } else if (req.query.favorited) {
        query._id = { $in: [] };
      }

      return Promise.all([
        Item.find(query)
          .limit(Number(limit))
          .skip(Number(offset))
          .sort({ createdAt: "desc" })
          .exec(),
        Item.count(query).exec(),
        req.payload ? User.findById(req.payload.id) : null
      ]).then(async function(results) {
        var items = results[0];
        var itemsCount = results[1];
        var user = results[2];
        return res.json({
          items: await Promise.all(
            items.map(async function(item) {
              item.seller = await User.findById(item.seller);
              return item.toJSONFor(user);
            })
          ),
          itemsCount: itemsCount
        });
      });
    })
    .catch(next);
});

router.get("/feed", auth.required, function(req, res, next) {
  var limit = 20;
  var offset = 0;

  if (typeof req.query.limit !== "undefined") {
    limit = req.query.limit;
  }

  if (typeof req.query.offset !== "undefined") {
    offset = req.query.offset;
  }

  User.findById(req.payload.id).then(function(user) {
    if (!user) {
      return res.sendStatus(401);
    }

    Promise.all([
      Item.find({ seller: { $in: user.following } })
        .limit(Number(limit))
        .skip(Number(offset))
        .populate("seller")
        .exec(),
      Item.count({ seller: { $in: user.following } })
    ])
      .then(function(results) {
        var items = results[0];
        var itemsCount = results[1];

        return res.json({
          items: items.map(function(item) {
            return item.toJSONFor(user);
          }),
          itemsCount: itemsCount
        });
      })
      .catch(next);
  });
});

router.post("/", auth.required, function(req, res, next) {
  User.findById(req.payload.id)
    .then(function(user) {
      if (!user) {
        return res.sendStatus(401);
      }

      var item = new Item(req.body.item);

      if(!item.image)
        item.image = "data:image/png;base64,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";
      
      item.seller = user;

      return item.save().then(function() {
        sendEvent('item_created', { item: req.body.item })
        return res.json({ item: item.toJSONFor(user) });
      });
    })
    .catch(next);
});

// return a item
router.get("/:item", auth.optional, function(req, res, next) {
  Promise.all([
    req.payload ? User.findById(req.payload.id) : null,
    req.item.populate("seller").execPopulate()
  ])
    .then(function(results) {
      var user = results[0];

      return res.json({ item: req.item.toJSONFor(user) });
    })
    .catch(next);
});

// update item
router.put("/:item", auth.required, function(req, res, next) {
  User.findById(req.payload.id).then(function(user) {
    if (req.item.seller._id.toString() === req.payload.id.toString()) {
      if (typeof req.body.item.title !== "undefined") {
        req.item.title = req.body.item.title;
      }

      if (typeof req.body.item.description !== "undefined") {
        req.item.description = req.body.item.description;
      }

      if (typeof req.body.item.image !== "undefined") {
        req.item.image = req.body.item.image;
      }

      if (typeof req.body.item.tagList !== "undefined") {
        req.item.tagList = req.body.item.tagList;
      }

      req.item
        .save()
        .then(function(item) {
          return res.json({ item: item.toJSONFor(user) });
        })
        .catch(next);
    } else {
      return res.sendStatus(403);
    }
  });
});

// delete item
router.delete("/:item", auth.required, function(req, res, next) {
  User.findById(req.payload.id)
    .then(function(user) {
      if (!user) {
        return res.sendStatus(401);
      }

      if (req.item.seller._id.toString() === req.payload.id.toString()) {
        return req.item.remove().then(function() {
          return res.sendStatus(204);
        });
      } else {
        return res.sendStatus(403);
      }
    })
    .catch(next);
});

// Favorite an item
router.post("/:item/favorite", auth.required, function(req, res, next) {
  var itemId = req.item._id;

  User.findById(req.payload.id)
    .then(function(user) {
      if (!user) {
        return res.sendStatus(401);
      }

      return user.favorite(itemId).then(function() {
        return req.item.updateFavoriteCount().then(function(item) {
          return res.json({ item: item.toJSONFor(user) });
        });
      });
    })
    .catch(next);
});

// Unfavorite an item
router.delete("/:item/favorite", auth.required, function(req, res, next) {
  var itemId = req.item._id;

  User.findById(req.payload.id)
    .then(function(user) {
      if (!user) {
        return res.sendStatus(401);
      }

      return user.unfavorite(itemId).then(function() {
        return req.item.updateFavoriteCount().then(function(item) {
          return res.json({ item: item.toJSONFor(user) });
        });
      });
    })
    .catch(next);
});

// return an item's comments
router.get("/:item/comments", auth.optional, function(req, res, next) {
  Promise.resolve(req.payload ? User.findById(req.payload.id) : null)
    .then(function(user) {
      return req.item
        .populate({
          path: "comments",
          populate: {
            path: "seller"
          },
          options: {
            sort: {
              createdAt: "desc"
            }
          }
        })
        .execPopulate()
        .then(function(item) {
          return res.json({
            comments: req.item.comments.map(function(comment) {
              return comment.toJSONFor(user);
            })
          });
        });
    })
    .catch(next);
});

// create a new comment
router.post("/:item/comments", auth.required, function(req, res, next) {
  User.findById(req.payload.id)
    .then(function(user) {
      if (!user) {
        return res.sendStatus(401);
      }

      var comment = new Comment(req.body.comment);
      comment.item = req.item;
      comment.seller = user;

      return comment.save().then(function() {
        req.item.comments = req.item.comments.concat([comment]);

        return req.item.save().then(function(item) {
          res.json({ comment: comment.toJSONFor(user) });
        });
      });
    })
    .catch(next);
});

router.delete("/:item/comments/:comment", auth.required, function(
  req,
  res,
  next
) {
  if (req.comment.seller.toString() === req.payload.id.toString()) {
    req.item.comments.remove(req.comment._id);
    req.item
      .save()
      .then(
        Comment.find({ _id: req.comment._id })
          .remove()
          .exec()
      )
      .then(function() {
        res.sendStatus(204);
      });
  } else {
    res.sendStatus(403);
  }
});

module.exports = router;
