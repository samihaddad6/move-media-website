// Every word on the page lives here. Placeholders are marked with `placeholder: true` and shown as such.
export const NAV = [
  ['About', '#about'],
  ['How it works', '#how'],
  ['Coverage', '#coverage'],
  ['Contact', '#contact'],
];

export const HERO = {
  title: 'Digital advertising on the move.',
  sub: 'Move Media places double-sided digital screens on the roofs of taxis, so your advertisement travels through the city all day.',
};

export const ABOUT = {
  title: 'Move Media is a Lebanese advertising company.',
  statement:
    'We place double-sided digital LED screens on the roofs of taxis. Brands book space on the screens, and their advertisements travel through the city all day, seen by people on the street, in traffic and on the pavement.',
};

export const STEPS = [
  { title: 'Your advertisement comes to us.', text: 'You send us the advertisement you would like to run on the screens.' },
  { title: 'It joins the 10-second loop.', text: 'Advertisements run as 10-second spots in a repeating loop, so yours returns to the screen regularly throughout the day.' },
  { title: 'It plays across the fleet.', text: 'The same loop runs on taxi roofs across the city, on screens that face both sides of the road.' },
  { title: 'Your brand travels the city.', text: 'The taxis carry your advertisement through the streets all day, past people walking, waiting and driving.' },
];

export const WHY = [
  { title: 'It goes where people are.', text: 'The advertisement moves with the taxi, through the streets where people walk, shop and wait in traffic.' },
  { title: 'Bright by day and by night.', text: 'The screens stay clear in full sun and after dark, so the advertisement is seen at every hour.' },
  { title: 'Seen from both sides of the road.', text: 'Each screen has two faces, seen at street level from either side. Each side can show the same advertisement or a different one.' },
  { title: 'Nothing to print.', text: 'Advertisements change quickly on the screens, with nothing to print and nothing to install.' },
];

// Messages the screens show on this site: Move Media's own brand only.
export const SCREEN_LINES = ['Your brand, across the city.', 'Digital advertising on the move.'];

export const COVERAGE = {
  title: 'Coverage',
  text: 'At launch, the fleet covers Beirut, Matn and Keserwan.',
  fleet: { value: 300, prefix: 'Up to ', label: 'taxis in the launch fleet', placeholder: true },
  launch: { value: 'January 2027', label: 'launch date', placeholder: true },
};

export const WHO = [
  { name: 'Brands', text: 'Keep your name in front of the city, on screens that travel all day.' },
  { name: 'Retailers', text: 'Show your shops and new arrivals on the streets around them.' },
  { name: 'Restaurants and cafes', text: 'Show your menu and your address to people out in the city.' },
  { name: 'Events', text: 'Announce the date and the place to the whole city before the day.' },
  { name: 'Launches and campaigns', text: 'Give a new product or campaign a presence across the city from its first day.' },
];

export const CONTACT = {
  title: 'Tell us about your campaign.',
  text: 'Send us a few details and we will get back to you.',
  // Placeholders, to be replaced before launch:
  email: { value: 'contact@example.com', shown: 'Email address to be added', placeholder: true },
  phone: { value: '', shown: 'Phone or WhatsApp number to be added', placeholder: true },
  instagram: { value: '', shown: 'Instagram account to be added', placeholder: true },
};

export const TAGLINE = 'Digital advertising on the move.';
