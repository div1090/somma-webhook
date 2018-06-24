var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var rp = require("request-promise-native");
const { WebhookClient } = require("dialogflow-fulfillment");

app.use(bodyParser.json());

const allowedFood = [
  "egg",
  "toilet paper",
  "brownie",
  "chilli crab",
  "mac and cheese"
];

const foodNameMap = {
  egg: "Yep, I got you a pack of 10 eggs",
  "toilet paper": "Done. It is ultra soft toilet tissue, 20 rolls",
  brownie:
    "Sure, I added Nutella spread and white flour. Since you already have eggs in your cart, I'm not adding it again.",
  "chilli crab":
    "Done. I've added Alaska guys frozen crab, Panda oyster sauce and 7 other spices and sauces",
  "mac and cheese":
    "Done. I've added gluten free pasta and anchor cheddar cheese. Since you already bought 2 milk cartons, I'm not adding it again."
};

const apiBase = "https://homeapi.fluidmap.io/";

app.post("/", function(request, response) {
  const agent = new WebhookClient({ request, response });

  function NTUCAdd(agent) {
    const ntucItem = request.body.queryResult.parameters["ntuc-item"][0];
    if (allowedFood.indexOf(ntucItem) >= 0) {
      return rp({
        url: `${apiBase}/order`,
        qs: {
          product: ntucItem
        }
      })
        .then(res => {
          console.log("hello");
          agent.add(foodNameMap[ntucItem]);
        })
        .catch(err => {
          console.log("error");
          agent.add(
            "Uh oh! Couldn't place the order at the moment. Could you please try again?"
          );
        });
    } else {
      agent.add("Sorry, We dont have it at the moment.");
      return rp({
        url: `${apiBase}/query`,
        qs: {
          query: request.body
        }
      })
        .then(res => {
          console.log(res);
          agent.add("Custom search");
        })
        .catch(err => {
          agent.add("Unable to add");
        });
    }
  }

  function NTUCMilk(agent) {
    agent.add(
      "Milk? We have an offer, would you like to buy 2 cartons for 3 dollars and 25 cents?"
    );
    agent.setContext({ name: "add-milk-followup" });
  }

  function MilkYes(agent) {
    return rp({
      url: `${apiBase}/order`,
      qs: {
        product: "milk2"
      }
    })
      .then(res => {
        agent.add(
          "Great! I added 2 cartons of Cow head fresh milk. Congrats on saving 95 cents."
        );
      })
      .catch(err => {
        agent.add(
          "Uh oh! Couldn't place the order at the moment. Could you please try again?"
        );
      });
  }

  function MilkNo(agent) {
    return rp({
      url: `${apiBase}/order`,
      qs: {
        product: "milk"
      }
    })
      .then(res => {
        agent.add(
          "No problem, I just got you 1 carton of Cow head fresh milk."
        );
      })
      .catch(err => {
        agent.add(
          "Uh oh! Couldn't place the order at the moment. Could you please try again?"
        );
      });
  }

  function NTUCBread(agent) {
    const ntucItem = request.body.queryResult.parameters["ntuc-bread"];
    agent.add(
      `You usually buy bread along with butter. Would you like me to add ${
        ntucItem === "bread" ? "butter" : "bread"
      } too?`
    );
    agent.setContext({ name: "add-bread-followup" });
  }

  function BreadYes(agent) {
    return rp({
      url: `${apiBase}/order`,
      qs: {
        product: "bread and butter"
      }
    })
      .then(res => {
        agent.add("Great! I have added bread and butter to your cart.");
      })
      .catch(err => {
        agent.add(
          "Uh oh! Couldn't place the order at the moment. Could you please try again?"
        );
      });
  }

  function BreadNo(agent) {
    const context = agent.getContext("add-bread-followup");

    return rp({
      url: `${apiBase}/order`,
      qs: {
        product: "bread"
      }
    })
      .then(res => {
        agent.add(
          `No problem, I just added ${
            context.parameters["ntuc-bread"]
          } to your basket.`
        );
      })
      .catch(err => {
        agent.add(
          "Uh oh! Couldn't place the order at the moment. Could you please try again?"
        );
      });
  }

  function CheckCart(agent) {
    agent.add("These are the items in your cart.");
  }

  function payment() {
    console.log("calling payments");
    rp({
      url: `${apiBase}/cart`
    })
      .then(res => {
        const price = res.total || 35.6;
        const items = res.items || [1, 2, 3, 4, 5, 6, 7, 8];
        console.log("price", price, items);
        agent.add(
          `You have ${
            items.length
          } items in your cart. It costs you ${price} dollars.`
        );
        if (price >= 10 && price < 40) {
          const diff = 40 - price;
          agent.add(
            `But you are ${diff} dollars away from free shipping. Do you want to shop more?`
          );
          agent.setContext({ name: "checkout-followup" });
        } else {
          paymentNo();
        }
      })
      .catch(err => {
        agent.add("Sorry there was an issue with your cart, please try again.");
      });
  }

  function paymentYes() {
    agent.add("Sure! What would you like to add to your basket?");
  }

  function paymentNo() {
    rp({
      url: `${apiBase}/pay`
    })
      .then(res => {
        agent.add(
          "Great, I have placed your order and will be delivered on Friday. I've also added the delivery slot in your calendar. Good day!"
        );
      })
      .catch(err => {
        agent.add("Something went wrong with payment, please try again.");
      });
  }

  let intentMap = new Map();
  intentMap.set("add-ntuc", NTUCAdd);

  intentMap.set("add-milk", NTUCMilk);
  intentMap.set("add-milk-yes", MilkYes);
  intentMap.set("add-milk-no", MilkNo);

  intentMap.set("add-bread", NTUCBread);
  intentMap.set("add-bread-yes", BreadYes);
  intentMap.set("add-bread-no", BreadNo);

  intentMap.set("checkout", payment);
  intentMap.set("checkout-yes", paymentYes);
  intentMap.set("checkout-no", paymentNo);

  agent.handleRequest(intentMap);
});

app.listen(4422);
