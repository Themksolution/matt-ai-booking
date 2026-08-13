export const BUSINESS_NAME = "Marlow Boating";

export const BUSINESS_GREETING = "Hi, this is Marlow Boating. How can I help you today?";

export const FAQ_ENTRIES = [
  {
    id: "services_offered",
    question: "What services do you provide?",
    answer:
      "We offer boat and craft hire, including canoes, single and double kayaks, SUPs, Mega SUPs, water bikes, and powered boats like Zen, Croc, and Little Red.",
    keywords: ["services", "service", "provide", "offer", "what do you offer", "offerings", "hire", "rent", "rental", "boat hire", "craft hire", "boats", "crafts", "canoe", "kayak", "sup", "mega sup", "water bike", "zen", "croc", "little red"],
  },
  {
    id: "availability_today",
    question: "Do you have availability today?",
    answer:
      "I can check that. What craft do you want, and what time were you hoping for?",
    keywords: ["availability", "today", "available", "time", "come", "same day"],
  },
  {
    id: "booking_general",
    question: "Can I book?",
    answer:
      "Of course. Just give me a moment to load up the booking system.",
    keywords: ["book", "booking", "reserve", "reservation", "hire", "rent", "rental"],
  },
  {
    id: "call_to_book",
    question:
      "I am trying to book on your website but it says call to book. Does that mean you have none available?",
    answer:
      "There is a two hour buffer online, so I would need to check availability for you.",
    keywords: ["website", "call to book", "buffer", "online booking"],
  },
  {
    id: "live_availability_system",
    question: "Is your online availability live and up to date?",
    answer:
      "Yes, whatever is available online is what we have available.",
    keywords: ["live", "up to date", "availability", "online", "website availability"],
  },
  {
    id: "location",
    question: "Where are you based?",
    answer:
      "We are inside the Bisham Abbey National Sports Centre, SL7 1RR. Follow the signs to boat hire. We are the big blue shed on the waterfront.",
    keywords: ["where", "based", "location", "address", "bisham", "sl7"],
  },
  {
    id: "parking",
    question: "Where can I park?",
    answer:
      "There is a free large car park at Bisham Abbey, plus paid charging spots. If it is busy, there is also free on street parking in Bisham.",
    keywords: ["park", "parking", "car park", "charge", "charging"],
  },
  {
    id: "late_arrival",
    question: "We are running a bit late. Is that okay?",
    answer:
      "That is okay. Once you arrive, we can see whether we can reschedule your hire so you still get as much time on the water as possible.",
    keywords: ["late", "running late", "reschedule", "delayed"],
  },
  {
    id: "river_licenses",
    question: "Do I need my own river license?",
    answer:
      "No, our boats are already covered by our river licenses.",
    keywords: ["license", "licence", "river", "lock keeper"],
  },
  {
    id: "refund_reschedule",
    question:
      "I have a problem and cannot attend my booking. What can I do to reschedule or get a refund?",
    answer:
      "We cannot offer refunds, but we can reschedule your booking or provide a gift card for the hire value.",
    keywords: ["refund", "reschedule", "gift card", "cannot attend", "cancel", "cancel booking"],
  },
  {
    id: "booking_fee_refund",
    question: "Can the booking fee be refunded?",
    answer:
      "No. The booking fee is a third party administration fee and is non refundable unless we cancel the booking.",
    keywords: ["booking fee", "admin fee", "refunded", "refundable"],
  },
  {
    id: "buoyancy_aids",
    question: "Do you provide life jackets or buoyancy aids?",
    answer:
      "Yes. Each participant is given a buoyancy aid to wear for the full hire.",
    keywords: ["life jacket", "lifejacket", "buoyancy", "aid", "safety jacket"],
  },
  {
    id: "briefing",
    question: "Am I told what to do?",
    answer:
      "Yes. You will get a safety briefing before the hire starts.",
    keywords: ["told what to do", "briefing", "instructions", "safety"],
  },
  {
    id: "staff_on_water",
    question: "Does someone come with us?",
    answer:
      "No. Hires go out without staff. The responsible adult must be 21 or over, or 25 or over for powered boats.",
    keywords: ["come with us", "staff", "guide", "accompany"],
  },
  {
    id: "swimming",
    question: "Do we need to be able to swim?",
    answer:
      "Yes, you do need to be confident you can get yourself and your group safely to the riverbank if needed.",
    keywords: ["swim", "swimming", "capsize", "water confidence"],
  },
  {
    id: "beginners",
    question: "What can I go in as a beginner?",
    answer:
      "All crafts can be used by beginners, but we usually suggest a canoe because it is the most stable.",
    keywords: ["beginner", "first time", "stable", "nervous", "new"],
  },
  {
    id: "own_boat",
    question: "Can someone launch their own boat if we are hiring?",
    answer:
      "Yes. If you are with someone who has their own craft, you can go together. Anyone bringing their own boat needs their own river license.",
    keywords: ["own boat", "launch", "bring own", "own craft"],
  },
  {
    id: "longer_hire",
    question: "What if I want to be out for longer than my hire?",
    answer:
      "That depends on availability. Let us know as soon as you can, and we will tell you if extra time is possible. Late returns are charged extra.",
    keywords: ["longer", "extra time", "late return", "extend", "stay out"],
  },
  {
    id: "work_group",
    question: "Can I book for a work group outing?",
    answer:
      "Yes. Please email your group size, preferred date, times, and craft preference to hello@marlowboating.com.",
    keywords: ["work group", "corporate", "outing", "group booking", "team"],
  },
  {
    id: "remote_hire",
    question: "What are your remote hire options?",
    answer:
      "Yes, remote hire is possible. Please email your group size, locations, date, times, and craft preference to hello@marlowboating.com.",
    keywords: ["remote hire", "start location", "finish location", "slipway"],
  },
  {
    id: "hurley_codes",
    question:
      "I am at Hurley campsite and having a problem with my booking and phone signal. Can you help by giving me the codes?",
    answer:
      "Yes, not a problem. What is the name on the booking so I can look into this?",
    keywords: ["hurley", "campsite", "codes", "phone signal"],
  },
  {
    id: "booking_error_extra_canoes",
    question:
      "I accidentally booked three canoes for three people. Can you check and cancel the additional boats?",
    answer:
      "What is the name on the booking so we can look into that for you?",
    keywords: ["accidentally booked", "three canoes", "cancel additional", "check booking"],
  },
  {
    id: "dogs_powered_boats",
    question: "Can dogs come onto your powered motor boats?",
    answer:
      "No. Dogs cannot come onto Zen, Croc, or Little Red.",
    keywords: ["dogs", "dog", "powered", "motor boat", "zen", "croc", "crocodile", "little red"],
  },
  {
    id: "dogs_unpowered",
    question: "Can dogs come onto your unpowered crafts?",
    answer:
      "Yes, but only in canoes and SUPs. Extra mess or damage charges may apply.",
    keywords: ["dogs", "dog", "unpowered", "canoe", "sup", "pet insurance"],
  },
  {
    id: "craft_capacity",
    question: "How many people can be in a craft?",
    answer:
      "Canoe seats 3. Single kayak 1. Double kayak 2. SUP 1. Water bike 1. Mega SUP 6. Zen 8. Croc 6. Little Red 4.",
    keywords: ["how many people", "capacity", "seats", "craft", "canoe", "kayak"],
  },
  {
    id: "age_requirements_general",
    question: "What are your age requirements?",
    answer:
      "For unpowered craft, someone aged 21 or over must book and be on the water. For Zen, Croc, and Little Red, someone aged 25 or over must book and be on the water.",
    keywords: ["age", "minimum age", "child", "adult", "powered boats", "age requirements"],
  },
  {
    id: "who_can_book_unpowered",
    question: "Who can book canoes, kayaks, SUPs, Mega SUPs, or water bikes?",
    answer:
      "Someone aged 21 or over must book and stay on the water the whole time for canoes, kayaks, SUPs, Mega SUPs, and water bikes.",
    keywords: ["who can book", "21+", "canoe", "kayak", "sup", "mega sup", "water bike"],
  },
  {
    id: "who_can_book_powered",
    question: "Who can book Zen, Croc, or Little Red?",
    answer:
      "Someone aged 25 or over must book and stay on the water for Zen, Croc, and Little Red.",
    keywords: ["who can book", "25+", "zen", "croc", "little red", "powered"],
  },
  {
    id: "solo_craft_teens",
    question: "Can 14 to 20 year olds go in solo craft?",
    answer:
      "Yes. Fourteen to twenty year olds can use a solo craft if they are supervised on the water by someone aged 21 or over in another craft.",
    keywords: ["14", "15", "16", "17", "18", "19", "20", "solo craft", "teen"],
  },
  {
    id: "children_same_craft",
    question: "Can 5 to 13 year olds go on the water?",
    answer:
      "Yes, but children aged 5 to 13 need to be in the same craft as someone aged 21 or over.",
    keywords: ["5", "6", "7", "8", "9", "10", "11", "12", "13", "children", "kids"],
  },
  {
    id: "powered_boats_minimums",
    question: "What are the minimum requirements for Zen, Croc, and Little Red?",
    answer:
      "Zen, Croc, and Little Red need at least 2 participants, and the minimum age is 3 as long as staff can fit the safety equipment properly.",
    keywords: ["minimum participants", "minimum age", "zen", "croc", "little red", "age 3"],
  },
  {
    id: "weight_limits",
    question: "What are the weight limits?",
    answer:
      "Weight limits are canoe 250 kilograms, single kayak 150, double kayak 250, SUP 120, and water bike 120. No weight limit is listed for Mega SUP, Zen, Croc, or Little Red.",
    keywords: ["weight", "weight limit", "kg", "capacity kg"],
  },
  {
    id: "lunch_stops",
    question: "What lunch stop options are there?",
    answer:
      "Lunch stop options include Two Brewers in Marlow, Hurley Village cafe or pub, The Bounty in Bourne End, The Ferry Inn in Cookham, and The Flowerpot in Aston.",
    keywords: ["lunch", "food stop", "pub", "cafe", "two brewers", "bounty", "ferry inn", "flowerpot"],
  },
  {
    id: "food_and_drink_on_crafts",
    question: "Can we take food and drink on your crafts?",
    answer:
      "Yes, you can bring a packed lunch, but please take your rubbish with you. Alcohol and water sports do not mix, so everyone must stay in control.",
    keywords: ["food", "drink", "packed lunch", "alcohol", "rubbish"],
  },
  {
    id: "distance_1_hour",
    question: "How far can we go on a 1 hour hire?",
    answer:
      "For a 1 hour hire, go upstream to Temple Lock, then come back past Bisham Abbey and down to Marlow Bridge before returning.",
    keywords: ["1 hour", "one hour", "distance", "how far", "temple lock", "marlow bridge"],
  },
  {
    id: "distance_2_hour",
    question: "How far can we go on a 2 hour hire?",
    answer:
      "For a 2 hour hire, go upstream through Temple Lock to Hurley Lock without going through it, then return to Bisham Abbey.",
    keywords: ["2 hour", "two hour", "distance", "how far", "hurley lock"],
  },
  {
    id: "distance_3_hour",
    question: "How far can we go on a 3 hour hire?",
    answer:
      "For a 3 hour hire, you can go to Temple Lock and Hurley Lock, and you may have time for a short stop at Hurley if timings allow.",
    keywords: ["3 hour", "three hour", "distance", "how far", "hurley"],
  },
  {
    id: "distance_full_day",
    question: "How far can we go on a full day hire?",
    answer:
      "For a full day hire, we usually recommend heading upstream through Temple Lock and Hurley Lock. You may have time to stop at The Flowerpot in Aston, or downstream toward The Bounty or The Ferry Inn if timings allow.",
    keywords: ["full day", "distance", "how far", "flowerpot", "aston", "bounty", "ferry inn"],
  },
  {
    id: "pricing_summary",
    question: "What are your prices?",
    answer:
      "Prices depend on the craft and hire length. Tell me which craft you want and for how long, and I will give you the price.",
    keywords: ["price", "pricing", "cost", "costs", "hire price", "adult", "child", "how much", "rate", "rates", "charge", "charges"],
  },
  {
    id: "canoe_prices",
    question: "What are your canoe prices?",
    answer:
      "Canoe prices are 20 for 1 hour, 30 for 2 hours, 40 for 3 hours or half day, and 65 for full day. Sundown hire is 95.",
    keywords: ["canoe", "price", "pricing", "1 hour", "2 hours", "3 hours", "full day", "sundown"],
  },
  {
    id: "single_kayak_prices",
    question: "What are your single kayak prices?",
    answer:
      "Single kayak prices are 15 for 1 hour, 20 for 2 hours, 30 for 3 hours or half day, and 45 for full day. Sundown hire is 75.",
    keywords: ["single kayak", "kayak single", "price", "pricing", "1 hour", "2 hours", "3 hours", "full day"],
  },
  {
    id: "double_kayak_prices",
    question: "What are your double kayak prices?",
    answer:
      "Double kayak prices are 20 for 1 hour, 30 for 2 hours, 40 for 3 hours or half day, and 65 for full day. Sundown hire is 95.",
    keywords: ["double kayak", "kayak double", "price", "pricing", "1 hour", "2 hours", "3 hours", "full day"],
  },
  {
    id: "sup_prices",
    question: "What are your SUP prices?",
    answer:
      "SUP prices are 15 for 1 hour, 20 for 2 hours, 30 for 3 hours or half day, and 45 for full day. Sundown hire is 75.",
    keywords: ["sup", "stand up paddleboard", "price", "pricing", "1 hour", "2 hours", "3 hours", "full day"],
  },
  {
    id: "water_bike_prices",
    question: "What are your water bike prices?",
    answer:
      "Water bike prices are 20 for 1 hour, 30 for 2 hours, 40 for 3 hours or half day, and 65 for full day. Sundown hire is 95.",
    keywords: ["water bike", "price", "pricing", "1 hour", "2 hours", "3 hours", "full day"],
  },
  {
    id: "mega_sup_prices",
    question: "What are your Mega SUP prices?",
    answer:
      "Mega SUP prices are 55 for 1 hour, 75 for 2 hours, and 95 for 3 hours or half day.",
    keywords: ["mega sup", "price", "pricing", "1 hour", "2 hours", "3 hours"],
  },
  {
    id: "zen_prices",
    question: "What are your Zen prices?",
    answer:
      "Zen weekday prices are 60 for 1 hour, 180 for 3 hours or half day, 300 for full day, and 440 for sundown hire. Weekend prices are 70, 200, 320, and 440.",
    keywords: ["zen", "price", "pricing", "weekday", "weekend", "full day", "sundown"],
  },
  {
    id: "croc_prices",
    question: "What are your Croc prices?",
    answer:
      "Croc weekday prices are 55 for 1 hour, 160 for 3 hours or half day, 260 for full day, and 380 for sundown hire. Weekend prices are 60, 170, 280, and 380.",
    keywords: ["croc", "crocodile", "price", "pricing", "weekday", "weekend", "full day", "sundown"],
  },
  {
    id: "little_red_prices",
    question: "What are your Little Red prices?",
    answer:
      "Little Red prices are 30 for half an hour, 50 for 1 hour, and 90 for 2 hours.",
    keywords: ["little red", "price", "pricing", "30 minutes", "half hour", "1 hour", "2 hours"],
  },
];
