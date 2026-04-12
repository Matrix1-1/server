/**
 * Seed Script
 * Populates the database with 20 public-domain movies from Internet Archive.
 * All stream URLs are real, freely accessible MP4 files.
 * 
 * Run with: node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Movie = require('./models/Movie');
const User = require('./models/User');

const MOVIES = [
  {
    title: "Nosferatu",
    description: "A vampire Count Orlok expresses interest in a new home and in the wife of his estate agent. A chilling masterpiece of German Expressionist cinema that defined the horror genre.",
    genre: ["Horror", "Classic"],
    year: 1922,
    rating: 8.1,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Nosferatu_Eine_Symphonie_des_Grauens_poster.jpg/640px-Nosferatu_Eine_Symphonie_des_Grauens_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/commons/4/49/Nosferatu_Eine_Symphonie_des_Grauens_poster.jpg",
    duration: 94,
    director: "F.W. Murnau",
    cast: ["Max Schreck", "Gustav von Wangenheim", "Greta Schröder"],
    streamUrl: "https://archive.org/download/Nosferatu_201303/Nosferatu.mp4",
    streamSources: [
      { provider: "archive", quality: "720p", url: "https://archive.org/download/Nosferatu_201303/Nosferatu.mp4", isHLS: false }
    ],
    isFeatured: true,
    isTrending: true,
  },
  {
    title: "Metropolis",
    description: "In a futuristic city sharply divided between the working class and the city planners, the son of the city's mastermind falls in love with a working class prophet. Fritz Lang's visionary sci-fi epic.",
    genre: ["Sci-Fi", "Drama", "Classic"],
    year: 1927,
    rating: 8.3,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Metropolis_film_1927.jpg/640px-Metropolis_film_1927.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/commons/3/35/Metropolis_film_1927.jpg",
    duration: 153,
    director: "Fritz Lang",
    cast: ["Brigitte Helm", "Alfred Abel", "Gustav Fröhlich"],
    streamUrl: "https://archive.org/download/Metropolis_655/Metropolis_512kb.mp4",
    streamSources: [
      { provider: "archive", quality: "480p", url: "https://archive.org/download/Metropolis_655/Metropolis_512kb.mp4", isHLS: false }
    ],
    isFeatured: true,
    isTrending: true,
  },
  {
    title: "The General",
    description: "Union spies steal an engineer's beloved locomotive and he single-handedly pursues it deep into enemy territory. Buster Keaton's greatest stunt-filled comedy adventure.",
    genre: ["Comedy", "Action", "Classic"],
    year: 1926,
    rating: 8.1,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/The_General_1926_film_poster.jpg/640px-The_General_1926_film_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/commons/3/3c/The_General_1926_film_poster.jpg",
    duration: 79,
    director: "Buster Keaton",
    cast: ["Buster Keaton", "Marion Mack", "Glen Cavender"],
    streamUrl: "https://archive.org/download/TheGeneral_201604/The%20General.mp4",
    streamSources: [
      { provider: "archive", quality: "720p", url: "https://archive.org/download/TheGeneral_201604/The%20General.mp4", isHLS: false }
    ],
    isTrending: true,
  },
  {
    title: "City Lights",
    description: "The Tramp falls in love with a blind flower girl and helps her pay for an operation to restore her sight. Charlie Chaplin's most beloved romantic comedy masterpiece.",
    genre: ["Comedy", "Romance", "Drama", "Classic"],
    year: 1931,
    rating: 8.5,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/City_lights_1931_poster.jpg/640px-City_lights_1931_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/commons/9/9c/City_lights_1931_poster.jpg",
    duration: 87,
    director: "Charlie Chaplin",
    cast: ["Charlie Chaplin", "Virginia Cherrill", "Florence Lee"],
    streamUrl: "https://archive.org/download/city_lights_1931/city_lights_1931_512kb.mp4",
    streamSources: [
      { provider: "archive", quality: "480p", url: "https://archive.org/download/city_lights_1931/city_lights_1931_512kb.mp4", isHLS: false }
    ],
    isFeatured: true,
  },
  {
    title: "Night of the Living Dead",
    description: "A group of people hide from bloodthirsty zombies in a farmhouse. George Romero's groundbreaking horror classic that invented the modern zombie genre.",
    genre: ["Horror", "Thriller"],
    year: 1968,
    rating: 7.9,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Night_of_the_Living_Dead_%281968%29_theatrical_poster.jpg/640px-Night_of_the_Living_Dead_%281968%29_theatrical_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/commons/2/28/Night_of_the_Living_Dead_%281968%29_theatrical_poster.jpg",
    duration: 96,
    director: "George A. Romero",
    cast: ["Duane Jones", "Judith O'Dea", "Karl Hardman"],
    streamUrl: "https://archive.org/download/night_of_the_living_dead/night_of_the_living_dead_512kb.mp4",
    streamSources: [
      { provider: "archive", quality: "480p", url: "https://archive.org/download/night_of_the_living_dead/night_of_the_living_dead_512kb.mp4", isHLS: false }
    ],
    isTrending: true,
  },
  {
    title: "His Girl Friday",
    description: "A newspaper editor uses every trick in the book to keep his ace reporter ex-wife from remarrying and leaving the paper. Screwball comedy at its lightning-fast finest.",
    genre: ["Comedy", "Romance", "Classic"],
    year: 1940,
    rating: 7.9,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/His_Girl_Friday_poster.jpg/640px-His_Girl_Friday_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/commons/d/d0/His_Girl_Friday_poster.jpg",
    duration: 92,
    director: "Howard Hawks",
    cast: ["Cary Grant", "Rosalind Russell", "Ralph Bellamy"],
    streamUrl: "https://archive.org/download/his_girl_friday/his_girl_friday_512kb.mp4",
    streamSources: [
      { provider: "archive", quality: "480p", url: "https://archive.org/download/his_girl_friday/his_girl_friday_512kb.mp4", isHLS: false }
    ],
  },
  {
    title: "The Cabinet of Dr. Caligari",
    description: "A hypnotist uses a sleepwalker to commit murders. The landmark of German Expressionist cinema with its twisted architecture and nightmarish visuals.",
    genre: ["Horror", "Thriller", "Classic"],
    year: 1920,
    rating: 8.0,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/The_Cabinet_of_Dr._Caligari_poster%2C_1920.jpg/640px-The_Cabinet_of_Dr._Caligari_poster%2C_1920.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/commons/7/74/The_Cabinet_of_Dr._Caligari_poster%2C_1920.jpg",
    duration: 71,
    director: "Robert Wiene",
    cast: ["Werner Krauss", "Conrad Veidt", "Friedrich Fehér"],
    streamUrl: "https://archive.org/download/TheCabinetOfDrCaligari_201701/TheCabinetOfDrCaligari.mp4",
    streamSources: [
      { provider: "archive", quality: "720p", url: "https://archive.org/download/TheCabinetOfDrCaligari_201701/TheCabinetOfDrCaligari.mp4", isHLS: false }
    ],
  },
  {
    title: "Sherlock Jr.",
    description: "A film projectionist daydreams of being a great detective and eventually enters the movie screen to become a daring hero. Buster Keaton's ingenious meta comedy.",
    genre: ["Comedy", "Action", "Classic"],
    year: 1924,
    rating: 8.2,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/SherlockJr.jpg/640px-SherlockJr.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/commons/2/23/SherlockJr.jpg",
    duration: 44,
    director: "Buster Keaton",
    cast: ["Buster Keaton", "Kathryn McGuire", "Joe Keaton"],
    streamUrl: "https://archive.org/download/SherJr_201503/SherJr.mp4",
    streamSources: [
      { provider: "archive", quality: "720p", url: "https://archive.org/download/SherJr_201503/SherJr.mp4", isHLS: false }
    ],
  },
  {
    title: "The Gold Rush",
    description: "The Lone Prospector ventures into the Klondike in search of gold and love. Chaplin's comic masterpiece featuring the famous roll dance and shoe-eating scene.",
    genre: ["Comedy", "Drama", "Classic"],
    year: 1925,
    rating: 8.1,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/The_Gold_Rush_1925_trailer_screenshot_%2815%29.jpg/640px-The_Gold_Rush_1925_trailer_screenshot_%2815%29.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/commons/8/84/The_Gold_Rush_1925_trailer_screenshot_%2815%29.jpg",
    duration: 95,
    director: "Charlie Chaplin",
    cast: ["Charlie Chaplin", "Mack Swain", "Tom Murray"],
    streamUrl: "https://archive.org/download/GoldRush_201312/GoldRush_512kb.mp4",
    streamSources: [
      { provider: "archive", quality: "480p", url: "https://archive.org/download/GoldRush_201312/GoldRush_512kb.mp4", isHLS: false }
    ],
  },
  {
    title: "Sunrise: A Song of Two Humans",
    description: "A farmer is persuaded by a city woman to drown his wife, but repents and spends the day rediscovering his love. F.W. Murnau's breathtaking poetic masterpiece.",
    genre: ["Drama", "Romance", "Classic"],
    year: 1927,
    rating: 8.1,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Sunrise_%E2%80%93_A_Song_of_Two_Humans_%281927_film%29.jpg/640px-Sunrise_%E2%80%93_A_Song_of_Two_Humans_%281927_film%29.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/commons/d/db/Sunrise_%E2%80%93_A_Song_of_Two_Humans_%281927_film%29.jpg",
    duration: 94,
    director: "F.W. Murnau",
    cast: ["George O'Brien", "Janet Gaynor", "Margaret Livingston"],
    streamUrl: "https://archive.org/download/Sunrise_A_Song_of_Two_Humans_1927/Sunrise_A_Song_of_Two_Humans_1927_512kb.mp4",
    streamSources: [
      { provider: "archive", quality: "480p", url: "https://archive.org/download/Sunrise_A_Song_of_Two_Humans_1927/Sunrise_A_Song_of_Two_Humans_1927_512kb.mp4", isHLS: false }
    ],
    isFeatured: true,
  },
  {
    title: "The Phantom of the Opera",
    description: "A disfigured musical genius haunts the Paris Opera House, terrorizing the opera community and pursuing his obsession for a soprano. Lon Chaney's iconic performance.",
    genre: ["Horror", "Romance", "Classic"],
    year: 1925,
    rating: 7.7,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Phantom_of_the_Opera_1925.jpg/640px-Phantom_of_the_Opera_1925.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/commons/1/16/Phantom_of_the_Opera_1925.jpg",
    duration: 107,
    director: "Rupert Julian",
    cast: ["Lon Chaney", "Mary Philbin", "Norman Kerry"],
    streamUrl: "https://archive.org/download/ThePhantomOfTheOpera_201504/ThePhantomOfTheOpera.mp4",
    streamSources: [
      { provider: "archive", quality: "720p", url: "https://archive.org/download/ThePhantomOfTheOpera_201504/ThePhantomOfTheOpera.mp4", isHLS: false }
    ],
  },
  {
    title: "Battleship Potemkin",
    description: "A story of the mutiny on the Russian battleship Potemkin and the subsequent public protest in Odessa. Eisenstein's revolutionary cinematic landmark.",
    genre: ["Drama", "Action", "Classic"],
    year: 1925,
    rating: 7.9,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Battleship_Potemkin_poster.jpg/640px-Battleship_Potemkin_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/commons/2/2b/Battleship_Potemkin_poster.jpg",
    duration: 75,
    director: "Sergei Eisenstein",
    cast: ["Aleksandr Antonov", "Vladimir Barsky", "Grigori Alexandrov"],
    streamUrl: "https://archive.org/download/BattleshipPotemkin_201512/BattleshipPotemkin_512kb.mp4",
    streamSources: [
      { provider: "archive", quality: "480p", url: "https://archive.org/download/BattleshipPotemkin_201512/BattleshipPotemkin_512kb.mp4", isHLS: false }
    ],
    isTrending: true,
  },
  {
    title: "Safety Last!",
    description: "A small-town boy makes good in the city and plans to impress his girlfriend by climbing a department store building. Harold Lloyd's most thrilling comedy.",
    genre: ["Comedy", "Action", "Classic"],
    year: 1923,
    rating: 8.1,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/SafetyLastPoster.jpg/640px-SafetyLastPoster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/commons/6/67/SafetyLastPoster.jpg",
    duration: 74,
    director: "Fred C. Newmeyer",
    cast: ["Harold Lloyd", "Mildred Davis", "Bill Strother"],
    streamUrl: "https://archive.org/download/SafetyLast1923/SafetyLast_512kb.mp4",
    streamSources: [
      { provider: "archive", quality: "480p", url: "https://archive.org/download/SafetyLast1923/SafetyLast_512kb.mp4", isHLS: false }
    ],
  },
  {
    title: "Dr. Jekyll and Mr. Hyde",
    description: "The story of a London doctor who runs afoul of his own experiments with good and evil, uncovering his inner beast. Classic horror with John Barrymore.",
    genre: ["Horror", "Drama", "Thriller", "Classic"],
    year: 1920,
    rating: 7.0,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Dr._Jekyll_and_Mr._Hyde_%281920_film%29_poster.jpg/640px-Dr._Jekyll_and_Mr._Hyde_%281920_film%29_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Dr._Jekyll_and_Mr._Hyde_%281920_film%29_poster.jpg",
    duration: 79,
    director: "John S. Robertson",
    cast: ["John Barrymore", "Martha Mansfield", "Brandon Hurst"],
    streamUrl: "https://archive.org/download/DrJekyllandMrHyde_201606/DrJekyllandMrHyde.mp4",
    streamSources: [
      { provider: "archive", quality: "720p", url: "https://archive.org/download/DrJekyllandMrHyde_201606/DrJekyllandMrHyde.mp4", isHLS: false }
    ],
  },
  {
    title: "The Kid",
    description: "The Tramp cares for an abandoned child, but when the boy is taken to an orphanage, The Tramp strives to reclaim the kid. Chaplin's first feature-length comedy.",
    genre: ["Comedy", "Drama", "Classic"],
    year: 1921,
    rating: 8.3,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/The_Kid_1921_film_poster.jpg/640px-The_Kid_1921_film_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/commons/e/e2/The_Kid_1921_film_poster.jpg",
    duration: 68,
    director: "Charlie Chaplin",
    cast: ["Charlie Chaplin", "Jackie Coogan", "Edna Purviance"],
    streamUrl: "https://archive.org/download/TheKid_201501/TheKid_512kb.mp4",
    streamSources: [
      { provider: "archive", quality: "480p", url: "https://archive.org/download/TheKid_201501/TheKid_512kb.mp4", isHLS: false }
    ],
    isFeatured: true,
  },
  {
    title: "Steamboat Bill Jr.",
    description: "The effete son of a gruff steamboat captain must prove his mettle in a battle against a rival boat owner. Features Keaton's legendary cyclone sequence.",
    genre: ["Comedy", "Action", "Classic"],
    year: 1928,
    rating: 7.9,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Steamboat_bill_jr_1928_poster.jpg/640px-Steamboat_bill_jr_1928_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/commons/8/83/Steamboat_bill_jr_1928_poster.jpg",
    duration: 71,
    director: "Buster Keaton",
    cast: ["Buster Keaton", "Ernest Torrence", "Marion Byron"],
    streamUrl: "https://archive.org/download/SteamboatBillJr/SteamboatBillJr_512kb.mp4",
    streamSources: [
      { provider: "archive", quality: "480p", url: "https://archive.org/download/SteamboatBillJr/SteamboatBillJr_512kb.mp4", isHLS: false }
    ],
  },
  {
    title: "The Birth of a Nation",
    description: "Two white families — one northern, one southern — react to the Civil War and its aftermath. D.W. Griffith's controversial and technically revolutionary epic.",
    genre: ["Drama", "Classic"],
    year: 1915,
    rating: 6.3,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Birth_of_a_nation_poster.jpg/640px-Birth_of_a_nation_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/commons/d/d4/Birth_of_a_nation_poster.jpg",
    duration: 190,
    director: "D.W. Griffith",
    cast: ["Lillian Gish", "Mae Marsh", "Henry B. Walthall"],
    streamUrl: "https://archive.org/download/birth_of_a_nation/birth_of_a_nation_512kb.mp4",
    streamSources: [
      { provider: "archive", quality: "480p", url: "https://archive.org/download/birth_of_a_nation/birth_of_a_nation_512kb.mp4", isHLS: false }
    ],
  },
  {
    title: "Way Out West",
    description: "Stan and Ollie travel to Brushwood Gulch to deliver a gold mine deed. Laurel and Hardy at their comedic best in this Western parody.",
    genre: ["Comedy", "Western", "Classic"],
    year: 1937,
    rating: 7.9,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Way_Out_West_1937_film_poster.jpg/640px-Way_Out_West_1937_film_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/commons/f/f7/Way_Out_West_1937_film_poster.jpg",
    duration: 65,
    director: "James W. Horne",
    cast: ["Stan Laurel", "Oliver Hardy", "Sharon Lynn"],
    streamUrl: "https://archive.org/download/WayOutWest1937/WayOutWest1937_512kb.mp4",
    streamSources: [
      { provider: "archive", quality: "480p", url: "https://archive.org/download/WayOutWest1937/WayOutWest1937_512kb.mp4", isHLS: false }
    ],
  },
  {
    title: "The Immigrant",
    description: "Charlie Chaplin's The Tramp immigrates to America and falls in love on the boat, then struggles in a restaurant. A short film gem with timeless emotional resonance.",
    genre: ["Comedy", "Romance", "Classic"],
    year: 1917,
    rating: 7.8,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/TheImmigrant1917.jpg/640px-TheImmigrant1917.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/commons/e/e6/TheImmigrant1917.jpg",
    duration: 24,
    director: "Charlie Chaplin",
    cast: ["Charlie Chaplin", "Edna Purviance", "Eric Campbell"],
    streamUrl: "https://archive.org/download/TheImmigrant1917/TheImmigrant1917_512kb.mp4",
    streamSources: [
      { provider: "archive", quality: "480p", url: "https://archive.org/download/TheImmigrant1917/TheImmigrant1917_512kb.mp4", isHLS: false }
    ],
  },
  {
    title: "Häxan: Witchcraft Through the Ages",
    description: "A study of how the Devil, demons and witches have been portrayed throughout the ages. A bizarre and fascinating documentary-horror hybrid.",
    genre: ["Documentary", "Horror", "Classic"],
    year: 1922,
    rating: 7.8,
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/H%C3%A4xan_1922_film_poster.jpg/640px-H%C3%A4xan_1922_film_poster.jpg",
    backdrop: "https://upload.wikimedia.org/wikipedia/commons/8/8f/H%C3%A4xan_1922_film_poster.jpg",
    duration: 87,
    director: "Benjamin Christensen",
    cast: ["Benjamin Christensen", "Elisabeth Christensen", "Maren Pedersen"],
    streamUrl: "https://archive.org/download/Haxan1922/Haxan1922_512kb.mp4",
    streamSources: [
      { provider: "archive", quality: "480p", url: "https://archive.org/download/Haxan1922/Haxan1922_512kb.mp4", isHLS: false }
    ],
    isTrending: true,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cinestream');
    console.log('✅ Connected to MongoDB');

    // Clear existing movies
    await Movie.deleteMany({});
    console.log('🗑️  Cleared existing movies');

    // Insert seed movies
    const inserted = await Movie.insertMany(MOVIES);
    console.log(`🎬 Inserted ${inserted.length} movies`);

    // ─────────────────────────────────────────────────────────────
    // ✏️  CHANGE THESE TO YOUR OWN EMAIL AND PASSWORD BEFORE RUNNING
    // ─────────────────────────────────────────────────────────────
    const ADMIN_EMAIL    = 'royalqueen@cinestream.com'; // ← change this
    const ADMIN_PASSWORD = 'TrueQueen@SheIsTheOne01';              // ← change this (min 6 chars)
    const ADMIN_USERNAME = 'admin';                 // ← change this
    // ─────────────────────────────────────────────────────────────

    // Delete existing admin and recreate (so password change takes effect on re-seed)
    await User.deleteOne({ role: 'admin' });
    await User.create({
      username: ADMIN_USERNAME,
      email:    ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role:     'admin',
    });
    console.log(`👤 Admin account created → ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

    console.log('\n✅ Seed complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seed();
