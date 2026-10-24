type Die = {
  name: string;
  quantity: number;
};

export const dice: [Die[], Die[]] = [
  [
    {
      name: "Backhand",
      quantity: 1,
    },
    {
      name: "Forehand",
      quantity: 2,
    },
    {
      name: "Roller",
      quantity: 2,
    },
    {
      name: "Hyzer",
      quantity: 1,
    },
    {
      name: "Anhyzer",
      quantity: 2,
    },
    {
      name: "Standstill",
      quantity: 2,
    },
    {
      name: "Joker",
      quantity: 1,
    },
  ],
  [
    {
      name: "Putter",
      quantity: 2,
    },
    {
      name: "Midrange",
      quantity: 2,
    },
    {
      name: "Driver",
      quantity: 2,
    },
    {
      name: "Understable",
      quantity: 2,
    },
    {
      name: "Overstable",
      quantity: 2,
    },
    {
      name: "Other's choice",
      quantity: 2,
    },
    {
      name: "Joker",
      quantity: 1,
    },
  ],
];
