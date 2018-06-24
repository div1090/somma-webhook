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
  egg: "Redmart Pack of 10 eggs",
  "toilet paper": "Kneelex ultra soft toilet tissue (20 rolls)",
  brownie:
    "Sure, I added Nutella hazzelhut spread and plain white flour. Since you already have eggs, I'm not adding it again.",
  "chilli crab":
    "Done. I've added Alaska guys frozen crab, Panda oyster sauce and 7 other spices and sauces",
  "mac and cheese":
    "Done. I've added gluten free pasta and anchor cheddar cheese. Since you already bought 2 milk cartons, I'm not adding it again."
};

const apiBase = "http://000cc624.ngrok.io";

app.post("/", function(request, response) {
  const agent = new WebhookClient({ request, response });

  function NTUCAdd(agent) {
    const ntucItem = request.body.queryResult.parameters["ntuc-item"][0];
    agent.add("Sure one moment..");
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
    agent.add("We have an offer, would you like to buy 2 for 325?");
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
      `You usually buy bread with butter. Would you like me to add ${
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
    const price = 42;
    if (price >= 34 && price < 40) {
      agent.add("You are close to free offer. Would you like to add more?");
      agent.setContext({ name: "checkout-followup" });
    } else {
      agent.add("will proceed to pay");
    }
  }

  function paymentYes() {
    agent.add("Sure! What would you like to add to your basket?");
  }

  function paymentNo() {
    agent.add("Cool, I will proceed to checkout and pay.");
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
