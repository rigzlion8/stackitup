// server/index.ts
import "dotenv/config";
import express from "express";
import * as path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import cors from "cors";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import Database from "better-sqlite3";
import { OpenAI } from "openai";
import cron from "node-cron";
import { MongoClient } from "mongodb";

// server/seed-data.ts
var seedTeams = [
  { id: "brighton", name: "Brighton & Hove Albion", country: "England", league: "epl" },
  { id: "brentford", name: "Brentford", country: "England", league: "epl" },
  { id: "bournemouth", name: "AFC Bournemouth", country: "England", league: "epl" },
  { id: "crystal_palace", name: "Crystal Palace", country: "England", league: "epl" },
  { id: "everton", name: "Everton", country: "England", league: "epl" },
  { id: "fulham", name: "Fulham", country: "England", league: "epl" },
  { id: "ipswich", name: "Ipswich Town", country: "England", league: "epl" },
  { id: "leicester", name: "Leicester City", country: "England", league: "epl" },
  { id: "nottingham_forest", name: "Nottingham Forest", country: "England", league: "epl" },
  { id: "southampton", name: "Southampton", country: "England", league: "epl" },
  { id: "west_ham", name: "West Ham United", country: "England", league: "epl" },
  { id: "wolves", name: "Wolverhampton Wanderers", country: "England", league: "epl" },
  { id: "portugal", name: "Portugal", country: "Portugal", league: "worldcup" },
  { id: "netherlands", name: "Netherlands", country: "Netherlands", league: "worldcup" },
  { id: "croatia", name: "Croatia", country: "Croatia", league: "worldcup" },
  { id: "uruguay", name: "Uruguay", country: "Uruguay", league: "worldcup" },
  { id: "belgium", name: "Belgium", country: "Belgium", league: "worldcup" },
  { id: "italy", name: "Italy", country: "Italy", league: "worldcup" }
];
var seedPlayers = [
  { id: "p_dunk", name: "Lewis Dunk", team_id: "brighton", country: "England", position: "Defender", number: 5, birth_date: "1991-11-21", height: 192, weight: 88, fifa_rating: 79, transfer_fee: 0, wages: 80, market_value: 10, preferred_foot: "R", appearances: 33, goals: 3, assists: 1, clean_sheets: 5, yellow_cards: 7, red_cards: 1, minutes_played: 2850, fantasy_points: 96, fantasy_value: 4.5 },
  { id: "p_mitoma", name: "Kaoru Mitoma", team_id: "brighton", country: "Japan", position: "Forward", number: 22, birth_date: "1997-05-20", height: 178, weight: 72, fifa_rating: 83, transfer_fee: 0, wages: 60, market_value: 55, preferred_foot: "R", appearances: 19, goals: 3, assists: 4, clean_sheets: 0, yellow_cards: 2, red_cards: 0, minutes_played: 1400, fantasy_points: 89, fantasy_value: 6.5 },
  { id: "p_joaopedro", name: "Joao Pedro", team_id: "brighton", country: "Brazil", position: "Forward", number: 9, birth_date: "2001-09-26", height: 182, weight: 73, fifa_rating: 80, transfer_fee: 30, wages: 70, market_value: 45, preferred_foot: "R", appearances: 31, goals: 9, assists: 3, clean_sheets: 0, yellow_cards: 4, red_cards: 0, minutes_played: 2100, fantasy_points: 128, fantasy_value: 7 },
  { id: "p_verbruggen", name: "Bart Verbruggen", team_id: "brighton", country: "Netherlands", position: "Goalkeeper", number: 1, birth_date: "2002-08-18", height: 193, weight: 85, fifa_rating: 78, transfer_fee: 20, wages: 30, market_value: 25, preferred_foot: "R", appearances: 21, goals: 0, assists: 0, clean_sheets: 5, yellow_cards: 1, red_cards: 0, minutes_played: 1860, fantasy_points: 72, fantasy_value: 4.5 },
  { id: "p_gross", name: "Pascal Gross", team_id: "brighton", country: "Germany", position: "Midfielder", number: 13, birth_date: "1991-06-15", height: 181, weight: 77, fifa_rating: 80, transfer_fee: 0, wages: 50, market_value: 10, preferred_foot: "R", appearances: 35, goals: 4, assists: 10, clean_sheets: 0, yellow_cards: 4, red_cards: 0, minutes_played: 3e3, fantasy_points: 131, fantasy_value: 5.5 },
  { id: "p_estupinan", name: "Pervis Estupinan", team_id: "brighton", country: "Ecuador", position: "Defender", number: 30, birth_date: "1998-01-21", height: 175, weight: 73, fifa_rating: 82, transfer_fee: 15, wages: 55, market_value: 38, preferred_foot: "L", appearances: 27, goals: 2, assists: 4, clean_sheets: 6, yellow_cards: 5, red_cards: 0, minutes_played: 2250, fantasy_points: 103, fantasy_value: 5 },
  { id: "p_tony", name: "Ivan Toney", team_id: "brentford", country: "England", position: "Forward", number: 17, birth_date: "1996-03-16", height: 185, weight: 78, fifa_rating: 84, transfer_fee: 0, wages: 60, market_value: 50, preferred_foot: "R", appearances: 21, goals: 8, assists: 2, clean_sheets: 0, yellow_cards: 5, red_cards: 0, minutes_played: 1750, fantasy_points: 101, fantasy_value: 7.5 },
  { id: "p_mbeumo", name: "Bryan Mbeumo", team_id: "brentford", country: "Cameroon", position: "Forward", number: 19, birth_date: "1999-08-07", height: 171, weight: 70, fifa_rating: 82, transfer_fee: 0, wages: 45, market_value: 45, preferred_foot: "L", appearances: 25, goals: 9, assists: 6, clean_sheets: 0, yellow_cards: 2, red_cards: 0, minutes_played: 2e3, fantasy_points: 130, fantasy_value: 7 },
  { id: "p_flekken", name: "Mark Flekken", team_id: "brentford", country: "Netherlands", position: "Goalkeeper", number: 1, birth_date: "1993-06-13", height: 195, weight: 88, fifa_rating: 79, transfer_fee: 12, wages: 40, market_value: 15, preferred_foot: "R", appearances: 37, goals: 0, assists: 0, clean_sheets: 7, yellow_cards: 0, red_cards: 0, minutes_played: 3300, fantasy_points: 94, fantasy_value: 4.5 },
  { id: "p_norgaard", name: "Christian Norgaard", team_id: "brentford", country: "Denmark", position: "Midfielder", number: 6, birth_date: "1994-03-10", height: 185, weight: 77, fifa_rating: 80, transfer_fee: 0, wages: 35, market_value: 18, preferred_foot: "R", appearances: 31, goals: 1, assists: 2, clean_sheets: 0, yellow_cards: 8, red_cards: 0, minutes_played: 2600, fantasy_points: 74, fantasy_value: 4.5 },
  { id: "p_pinnock", name: "Ethan Pinnock", team_id: "brentford", country: "Jamaica", position: "Defender", number: 5, birth_date: "1993-05-29", height: 187, weight: 82, fifa_rating: 78, transfer_fee: 0, wages: 20, market_value: 12, preferred_foot: "L", appearances: 29, goals: 2, assists: 1, clean_sheets: 5, yellow_cards: 2, red_cards: 0, minutes_played: 2450, fantasy_points: 87, fantasy_value: 4 },
  { id: "p_solanke", name: "Dominic Solanke", team_id: "bournemouth", country: "England", position: "Forward", number: 9, birth_date: "1997-09-14", height: 187, weight: 82, fifa_rating: 83, transfer_fee: 60, wages: 70, market_value: 45, preferred_foot: "R", appearances: 38, goals: 19, assists: 3, clean_sheets: 0, yellow_cards: 3, red_cards: 0, minutes_played: 3100, fantasy_points: 167, fantasy_value: 8.5 },
  { id: "p_neto", name: "Neto", team_id: "bournemouth", country: "Brazil", position: "Goalkeeper", number: 1, birth_date: "1989-07-19", height: 190, weight: 84, fifa_rating: 78, transfer_fee: 0, wages: 40, market_value: 3, preferred_foot: "R", appearances: 32, goals: 0, assists: 0, clean_sheets: 7, yellow_cards: 3, red_cards: 0, minutes_played: 2850, fantasy_points: 86, fantasy_value: 4 },
  { id: "p_kerkez", name: "Milos Kerkez", team_id: "bournemouth", country: "Hungary", position: "Defender", number: 3, birth_date: "2003-11-07", height: 180, weight: 75, fifa_rating: 78, transfer_fee: 15, wages: 25, market_value: 30, preferred_foot: "L", appearances: 28, goals: 0, assists: 1, clean_sheets: 5, yellow_cards: 6, red_cards: 0, minutes_played: 2400, fantasy_points: 72, fantasy_value: 4.5 },
  { id: "p_christie", name: "Ryan Christie", team_id: "bournemouth", country: "Scotland", position: "Midfielder", number: 10, birth_date: "1995-02-22", height: 178, weight: 72, fifa_rating: 78, transfer_fee: 0, wages: 20, market_value: 12, preferred_foot: "R", appearances: 37, goals: 0, assists: 4, clean_sheets: 0, yellow_cards: 6, red_cards: 0, minutes_played: 2950, fantasy_points: 69, fantasy_value: 4 },
  { id: "p_eze", name: "Eberechi Eze", team_id: "crystal_palace", country: "England", position: "Midfielder", number: 10, birth_date: "1998-06-29", height: 178, weight: 74, fifa_rating: 83, transfer_fee: 0, wages: 70, market_value: 60, preferred_foot: "R", appearances: 27, goals: 11, assists: 4, clean_sheets: 0, yellow_cards: 2, red_cards: 0, minutes_played: 2250, fantasy_points: 137, fantasy_value: 8 },
  { id: "p_olise", name: "Michael Olise", team_id: "crystal_palace", country: "France", position: "Midfielder", number: 7, birth_date: "2001-12-12", height: 184, weight: 73, fifa_rating: 84, transfer_fee: 45, wages: 65, market_value: 65, preferred_foot: "L", appearances: 19, goals: 10, assists: 6, clean_sheets: 0, yellow_cards: 2, red_cards: 0, minutes_played: 1500, fantasy_points: 130, fantasy_value: 8.5 },
  { id: "p_andersen", name: "Joachim Andersen", team_id: "crystal_palace", country: "Denmark", position: "Defender", number: 16, birth_date: "1996-05-31", height: 192, weight: 86, fifa_rating: 80, transfer_fee: 17, wages: 50, market_value: 25, preferred_foot: "R", appearances: 38, goals: 2, assists: 3, clean_sheets: 7, yellow_cards: 5, red_cards: 0, minutes_played: 3350, fantasy_points: 113, fantasy_value: 5 },
  { id: "p_henderson", name: "Dean Henderson", team_id: "crystal_palace", country: "England", position: "Goalkeeper", number: 1, birth_date: "1997-03-12", height: 188, weight: 85, fifa_rating: 79, transfer_fee: 15, wages: 60, market_value: 18, preferred_foot: "R", appearances: 18, goals: 0, assists: 0, clean_sheets: 5, yellow_cards: 1, red_cards: 0, minutes_played: 1600, fantasy_points: 62, fantasy_value: 4.5 },
  { id: "p_mateta", name: "Jean-Philippe Mateta", team_id: "crystal_palace", country: "France", position: "Forward", number: 14, birth_date: "1997-06-28", height: 192, weight: 85, fifa_rating: 79, transfer_fee: 10, wages: 30, market_value: 20, preferred_foot: "R", appearances: 35, goals: 16, assists: 5, clean_sheets: 0, yellow_cards: 3, red_cards: 0, minutes_played: 2300, fantasy_points: 139, fantasy_value: 6.5 },
  { id: "p_pickford_ev", name: "Jordan Pickford", team_id: "everton", country: "England", position: "Goalkeeper", number: 1, birth_date: "1994-03-07", height: 185, weight: 77, fifa_rating: 83, transfer_fee: 25, wages: 80, market_value: 22, preferred_foot: "L", appearances: 38, goals: 0, assists: 0, clean_sheets: 11, yellow_cards: 3, red_cards: 0, minutes_played: 3420, fantasy_points: 115, fantasy_value: 5 },
  { id: "p_tarkowski", name: "James Tarkowski", team_id: "everton", country: "England", position: "Defender", number: 6, birth_date: "1992-11-19", height: 185, weight: 81, fifa_rating: 79, transfer_fee: 0, wages: 30, market_value: 10, preferred_foot: "R", appearances: 38, goals: 1, assists: 1, clean_sheets: 11, yellow_cards: 11, red_cards: 0, minutes_played: 3420, fantasy_points: 118, fantasy_value: 4.5 },
  { id: "p_doucoure", name: "Abdoulaye Doucoure", team_id: "everton", country: "Mali", position: "Midfielder", number: 16, birth_date: "1993-01-01", height: 183, weight: 75, fifa_rating: 78, transfer_fee: 20, wages: 70, market_value: 15, preferred_foot: "R", appearances: 32, goals: 7, assists: 1, clean_sheets: 0, yellow_cards: 7, red_cards: 0, minutes_played: 2700, fantasy_points: 100, fantasy_value: 4.5 },
  { id: "p_calvertlewin", name: "Dominic Calvert-Lewin", team_id: "everton", country: "England", position: "Forward", number: 9, birth_date: "1997-03-16", height: 187, weight: 82, fifa_rating: 79, transfer_fee: 0, wages: 80, market_value: 25, preferred_foot: "R", appearances: 32, goals: 7, assists: 2, clean_sheets: 0, yellow_cards: 4, red_cards: 1, minutes_played: 2100, fantasy_points: 90, fantasy_value: 5.5 },
  { id: "p_leno", name: "Bernd Leno", team_id: "fulham", country: "Germany", position: "Goalkeeper", number: 17, birth_date: "1992-03-04", height: 190, weight: 83, fifa_rating: 82, transfer_fee: 0, wages: 70, market_value: 12, preferred_foot: "R", appearances: 38, goals: 0, assists: 0, clean_sheets: 9, yellow_cards: 2, red_cards: 0, minutes_played: 3420, fantasy_points: 103, fantasy_value: 4.5 },
  { id: "p_palhinha", name: "Joao Palhinha", team_id: "fulham", country: "Portugal", position: "Midfielder", number: 26, birth_date: "1995-07-09", height: 190, weight: 85, fifa_rating: 84, transfer_fee: 0, wages: 50, market_value: 40, preferred_foot: "R", appearances: 31, goals: 4, assists: 1, clean_sheets: 0, yellow_cards: 13, red_cards: 0, minutes_played: 2600, fantasy_points: 91, fantasy_value: 5.5 },
  { id: "p_jimenez", name: "Raul Jimenez", team_id: "fulham", country: "Mexico", position: "Forward", number: 7, birth_date: "1991-05-05", height: 190, weight: 84, fifa_rating: 79, transfer_fee: 0, wages: 40, market_value: 8, preferred_foot: "R", appearances: 19, goals: 5, assists: 1, clean_sheets: 0, yellow_cards: 1, red_cards: 1, minutes_played: 850, fantasy_points: 62, fantasy_value: 4 },
  { id: "p_robinson", name: "Antonee Robinson", team_id: "fulham", country: "United States", position: "Defender", number: 33, birth_date: "1997-08-08", height: 183, weight: 75, fifa_rating: 80, transfer_fee: 0, wages: 25, market_value: 30, preferred_foot: "L", appearances: 37, goals: 0, assists: 6, clean_sheets: 6, yellow_cards: 4, red_cards: 0, minutes_played: 3200, fantasy_points: 103, fantasy_value: 5 },
  { id: "p_murphy", name: "Sam Morsy", team_id: "ipswich", country: "Egypt", position: "Midfielder", number: 5, birth_date: "1991-09-10", height: 175, weight: 75, fifa_rating: 74, transfer_fee: 0, wages: 10, market_value: 8, preferred_foot: "R", appearances: 42, goals: 2, assists: 5, clean_sheets: 0, yellow_cards: 12, red_cards: 0, minutes_played: 3600, fantasy_points: 89, fantasy_value: 3 },
  { id: "p_hirst", name: "George Hirst", team_id: "ipswich", country: "England", position: "Forward", number: 27, birth_date: "1999-02-15", height: 191, weight: 83, fifa_rating: 72, transfer_fee: 0, wages: 8, market_value: 10, preferred_foot: "R", appearances: 38, goals: 12, assists: 4, clean_sheets: 0, yellow_cards: 3, red_cards: 0, minutes_played: 2700, fantasy_points: 98, fantasy_value: 3.5 },
  { id: "p_walton", name: "Christian Walton", team_id: "ipswich", country: "England", position: "Goalkeeper", number: 1, birth_date: "1995-11-09", height: 196, weight: 90, fifa_rating: 73, transfer_fee: 0, wages: 5, market_value: 5, preferred_foot: "R", appearances: 46, goals: 0, assists: 0, clean_sheets: 15, yellow_cards: 1, red_cards: 0, minutes_played: 4140, fantasy_points: 105, fantasy_value: 2.5 },
  { id: "p_vardy", name: "Jamie Vardy", team_id: "leicester", country: "England", position: "Forward", number: 9, birth_date: "1987-01-11", height: 179, weight: 76, fifa_rating: 78, transfer_fee: 0, wages: 100, market_value: 18, preferred_foot: "R", appearances: 35, goals: 18, assists: 2, clean_sheets: 0, yellow_cards: 3, red_cards: 0, minutes_played: 2700, fantasy_points: 134, fantasy_value: 6 },
  { id: "p_hermansen", name: "Mads Hermansen", team_id: "leicester", country: "Denmark", position: "Goalkeeper", number: 30, birth_date: "2000-07-11", height: 187, weight: 82, fifa_rating: 76, transfer_fee: 0, wages: 15, market_value: 12, preferred_foot: "R", appearances: 44, goals: 0, assists: 0, clean_sheets: 13, yellow_cards: 1, red_cards: 0, minutes_played: 3960, fantasy_points: 102, fantasy_value: 3.5 },
  { id: "p_dewsburyhall", name: "Kiernan Dewsbury-Hall", team_id: "leicester", country: "England", position: "Midfielder", number: 22, birth_date: "1998-09-06", height: 178, weight: 72, fifa_rating: 79, transfer_fee: 0, wages: 30, market_value: 28, preferred_foot: "L", appearances: 44, goals: 12, assists: 14, clean_sheets: 0, yellow_cards: 6, red_cards: 0, minutes_played: 3700, fantasy_points: 162, fantasy_value: 6.5 },
  { id: "p_fatawu", name: "Abdul Fatawu", team_id: "leicester", country: "Ghana", position: "Forward", number: 18, birth_date: "2004-03-08", height: 175, weight: 70, fifa_rating: 76, transfer_fee: 0, wages: 15, market_value: 18, preferred_foot: "L", appearances: 40, goals: 6, assists: 13, clean_sheets: 0, yellow_cards: 4, red_cards: 0, minutes_played: 2900, fantasy_points: 127, fantasy_value: 5.5 },
  { id: "p_gibbs-white", name: "Morgan Gibbs-White", team_id: "nottingham_forest", country: "England", position: "Midfielder", number: 10, birth_date: "2000-01-27", height: 178, weight: 72, fifa_rating: 81, transfer_fee: 25, wages: 70, market_value: 40, preferred_foot: "R", appearances: 37, goals: 5, assists: 10, clean_sheets: 0, yellow_cards: 9, red_cards: 0, minutes_played: 2900, fantasy_points: 120, fantasy_value: 6 },
  { id: "p_awoniyi", name: "Taiwo Awoniyi", team_id: "nottingham_forest", country: "Nigeria", position: "Forward", number: 9, birth_date: "1997-08-12", height: 183, weight: 83, fifa_rating: 78, transfer_fee: 17, wages: 40, market_value: 28, preferred_foot: "R", appearances: 20, goals: 6, assists: 2, clean_sheets: 0, yellow_cards: 2, red_cards: 0, minutes_played: 1100, fantasy_points: 72, fantasy_value: 5 },
  { id: "p_selse", name: "Matz Sels", team_id: "nottingham_forest", country: "Belgium", position: "Goalkeeper", number: 26, birth_date: "1992-02-26", height: 188, weight: 83, fifa_rating: 77, transfer_fee: 6, wages: 25, market_value: 10, preferred_foot: "R", appearances: 16, goals: 0, assists: 0, clean_sheets: 3, yellow_cards: 1, red_cards: 0, minutes_played: 1440, fantasy_points: 47, fantasy_value: 3.5 },
  { id: "p_armstrong", name: "Adam Armstrong", team_id: "southampton", country: "England", position: "Forward", number: 9, birth_date: "1997-02-10", height: 173, weight: 72, fifa_rating: 77, transfer_fee: 0, wages: 25, market_value: 15, preferred_foot: "R", appearances: 46, goals: 21, assists: 11, clean_sheets: 0, yellow_cards: 4, red_cards: 0, minutes_played: 3700, fantasy_points: 178, fantasy_value: 5.5 },
  { id: "p_bazunu", name: "Gavin Bazunu", team_id: "southampton", country: "Ireland", position: "Goalkeeper", number: 31, birth_date: "2002-02-20", height: 189, weight: 80, fifa_rating: 74, transfer_fee: 12, wages: 20, market_value: 15, preferred_foot: "R", appearances: 41, goals: 0, assists: 0, clean_sheets: 11, yellow_cards: 1, red_cards: 0, minutes_played: 3690, fantasy_points: 93, fantasy_value: 3 },
  { id: "p_walkerpeters", name: "Kyle Walker-Peters", team_id: "southampton", country: "England", position: "Defender", number: 2, birth_date: "1997-04-13", height: 173, weight: 68, fifa_rating: 78, transfer_fee: 0, wages: 25, market_value: 20, preferred_foot: "R", appearances: 43, goals: 2, assists: 4, clean_sheets: 9, yellow_cards: 5, red_cards: 0, minutes_played: 3650, fantasy_points: 99, fantasy_value: 4 },
  { id: "p_bowen", name: "Jarrod Bowen", team_id: "west_ham", country: "England", position: "Forward", number: 20, birth_date: "1996-12-20", height: 175, weight: 70, fifa_rating: 84, transfer_fee: 0, wages: 90, market_value: 50, preferred_foot: "L", appearances: 34, goals: 16, assists: 6, clean_sheets: 0, yellow_cards: 2, red_cards: 0, minutes_played: 2850, fantasy_points: 163, fantasy_value: 8 },
  { id: "p_paqueta", name: "Lucas Paqueta", team_id: "west_ham", country: "Brazil", position: "Midfielder", number: 10, birth_date: "1997-08-27", height: 180, weight: 72, fifa_rating: 82, transfer_fee: 45, wages: 130, market_value: 65, preferred_foot: "L", appearances: 31, goals: 4, assists: 6, clean_sheets: 0, yellow_cards: 10, red_cards: 0, minutes_played: 2400, fantasy_points: 99, fantasy_value: 6 },
  { id: "p_areola", name: "Alphonse Areola", team_id: "west_ham", country: "France", position: "Goalkeeper", number: 23, birth_date: "1993-02-27", height: 195, weight: 91, fifa_rating: 80, transfer_fee: 0, wages: 75, market_value: 15, preferred_foot: "R", appearances: 31, goals: 0, assists: 0, clean_sheets: 5, yellow_cards: 1, red_cards: 0, minutes_played: 2760, fantasy_points: 80, fantasy_value: 4.5 },
  { id: "p_kudus", name: "Mohammed Kudus", team_id: "west_ham", country: "Ghana", position: "Midfielder", number: 14, birth_date: "2000-08-02", height: 177, weight: 74, fifa_rating: 82, transfer_fee: 38, wages: 80, market_value: 50, preferred_foot: "L", appearances: 33, goals: 8, assists: 6, clean_sheets: 0, yellow_cards: 4, red_cards: 0, minutes_played: 2400, fantasy_points: 121, fantasy_value: 7 },
  { id: "p_zouma", name: "Kurt Zouma", team_id: "west_ham", country: "France", position: "Defender", number: 4, birth_date: "1994-10-27", height: 190, weight: 92, fifa_rating: 80, transfer_fee: 30, wages: 100, market_value: 20, preferred_foot: "R", appearances: 33, goals: 3, assists: 0, clean_sheets: 6, yellow_cards: 4, red_cards: 0, minutes_played: 2800, fantasy_points: 97, fantasy_value: 5 },
  { id: "p_neto_w", name: "Pedro Neto", team_id: "wolves", country: "Portugal", position: "Forward", number: 7, birth_date: "2000-03-09", height: 173, weight: 62, fifa_rating: 83, transfer_fee: 0, wages: 50, market_value: 55, preferred_foot: "L", appearances: 20, goals: 2, assists: 9, clean_sheets: 0, yellow_cards: 3, red_cards: 0, minutes_played: 1600, fantasy_points: 82, fantasy_value: 7.5 },
  { id: "p_cunha", name: "Matheus Cunha", team_id: "wolves", country: "Brazil", position: "Forward", number: 12, birth_date: "1999-05-27", height: 184, weight: 78, fifa_rating: 81, transfer_fee: 44, wages: 80, market_value: 45, preferred_foot: "R", appearances: 32, goals: 12, assists: 7, clean_sheets: 0, yellow_cards: 6, red_cards: 0, minutes_played: 2400, fantasy_points: 140, fantasy_value: 7 },
  { id: "p_sa", name: "Jose Sa", team_id: "wolves", country: "Portugal", position: "Goalkeeper", number: 1, birth_date: "1993-01-17", height: 192, weight: 84, fifa_rating: 80, transfer_fee: 0, wages: 35, market_value: 10, preferred_foot: "R", appearances: 35, goals: 0, assists: 0, clean_sheets: 5, yellow_cards: 3, red_cards: 0, minutes_played: 3100, fantasy_points: 85, fantasy_value: 4 },
  { id: "p_kilman", name: "Max Kilman", team_id: "wolves", country: "England", position: "Defender", number: 23, birth_date: "1997-05-23", height: 192, weight: 82, fifa_rating: 81, transfer_fee: 0, wages: 30, market_value: 15, preferred_foot: "L", appearances: 38, goals: 2, assists: 0, clean_sheets: 5, yellow_cards: 6, red_cards: 0, minutes_played: 3350, fantasy_points: 99, fantasy_value: 4.5 },
  { id: "p_aitnouri", name: "Rayan Ait-Nouri", team_id: "wolves", country: "Algeria", position: "Defender", number: 3, birth_date: "2001-06-06", height: 180, weight: 70, fifa_rating: 79, transfer_fee: 0, wages: 20, market_value: 30, preferred_foot: "L", appearances: 33, goals: 2, assists: 1, clean_sheets: 4, yellow_cards: 7, red_cards: 0, minutes_played: 2450, fantasy_points: 80, fantasy_value: 4.5 },
  { id: "p_ronaldo", name: "Cristiano Ronaldo", team_id: "portugal", country: "Portugal", position: "Forward", number: 7, birth_date: "1985-02-05", height: 187, weight: 84, fifa_rating: 83, transfer_fee: 0, wages: 400, market_value: 8, preferred_foot: "R", appearances: 5, goals: 3, assists: 1, clean_sheets: 0, yellow_cards: 0, red_cards: 0, minutes_played: 450, fantasy_points: 38, fantasy_value: 8 },
  { id: "p_diascosta", name: "Diogo Costa", team_id: "portugal", country: "Portugal", position: "Goalkeeper", number: 22, birth_date: "1999-09-19", height: 186, weight: 82, fifa_rating: 84, transfer_fee: 0, wages: 45, market_value: 30, preferred_foot: "R", appearances: 5, goals: 0, assists: 0, clean_sheets: 2, yellow_cards: 0, red_cards: 0, minutes_played: 480, fantasy_points: 21, fantasy_value: 6 },
  { id: "p_bf_pt", name: "Bruno Fernandes", team_id: "portugal", country: "Portugal", position: "Midfielder", number: 8, birth_date: "1994-09-08", height: 179, weight: 69, fifa_rating: 87, transfer_fee: 65, wages: 300, market_value: 65, preferred_foot: "R", appearances: 6, goals: 2, assists: 3, clean_sheets: 0, yellow_cards: 1, red_cards: 0, minutes_played: 520, fantasy_points: 65, fantasy_value: 9.5 },
  { id: "p_vandijk_nl", name: "Virgil van Dijk", team_id: "netherlands", country: "Netherlands", position: "Defender", number: 4, birth_date: "1991-07-08", height: 193, weight: 92, fifa_rating: 89, transfer_fee: 75, wages: 260, market_value: 28, preferred_foot: "R", appearances: 6, goals: 0, assists: 0, clean_sheets: 2, yellow_cards: 1, red_cards: 0, minutes_played: 540, fantasy_points: 52, fantasy_value: 6.5 },
  { id: "p_depay", name: "Memphis Depay", team_id: "netherlands", country: "Netherlands", position: "Forward", number: 10, birth_date: "1994-02-13", height: 178, weight: 78, fifa_rating: 82, transfer_fee: 0, wages: 0, market_value: 15, preferred_foot: "R", appearances: 6, goals: 2, assists: 1, clean_sheets: 0, yellow_cards: 1, red_cards: 0, minutes_played: 400, fantasy_points: 48, fantasy_value: 6 },
  { id: "p_gakpo", name: "Cody Gakpo", team_id: "netherlands", country: "Netherlands", position: "Forward", number: 8, birth_date: "1999-05-07", height: 189, weight: 80, fifa_rating: 84, transfer_fee: 42, wages: 70, market_value: 55, preferred_foot: "R", appearances: 6, goals: 3, assists: 1, clean_sheets: 0, yellow_cards: 0, red_cards: 0, minutes_played: 480, fantasy_points: 68, fantasy_value: 7.5 },
  { id: "p_ake", name: "Nathan Ake", team_id: "netherlands", country: "Netherlands", position: "Defender", number: 5, birth_date: "1995-02-18", height: 180, weight: 75, fifa_rating: 82, transfer_fee: 45, wages: 60, market_value: 28, preferred_foot: "L", appearances: 5, goals: 0, assists: 0, clean_sheets: 2, yellow_cards: 0, red_cards: 0, minutes_played: 420, fantasy_points: 43, fantasy_value: 5.5 },
  { id: "p_modric", name: "Luka Modric", team_id: "croatia", country: "Croatia", position: "Midfielder", number: 10, birth_date: "1985-09-09", height: 172, weight: 66, fifa_rating: 85, transfer_fee: 0, wages: 200, market_value: 4, preferred_foot: "R", appearances: 6, goals: 1, assists: 2, clean_sheets: 0, yellow_cards: 1, red_cards: 0, minutes_played: 500, fantasy_points: 52, fantasy_value: 6 },
  { id: "p_gvardiol", name: "Josko Gvardiol", team_id: "croatia", country: "Croatia", position: "Defender", number: 4, birth_date: "2002-01-23", height: 185, weight: 80, fifa_rating: 85, transfer_fee: 90, wages: 70, market_value: 75, preferred_foot: "L", appearances: 6, goals: 1, assists: 0, clean_sheets: 2, yellow_cards: 2, red_cards: 0, minutes_played: 540, fantasy_points: 63, fantasy_value: 7 },
  { id: "p_livakovic", name: "Dominik Livakovic", team_id: "croatia", country: "Croatia", position: "Goalkeeper", number: 1, birth_date: "1995-01-09", height: 187, weight: 80, fifa_rating: 81, transfer_fee: 0, wages: 20, market_value: 8, preferred_foot: "R", appearances: 6, goals: 0, assists: 0, clean_sheets: 2, yellow_cards: 0, red_cards: 0, minutes_played: 540, fantasy_points: 48, fantasy_value: 5 },
  { id: "p_valverde", name: "Federico Valverde", team_id: "uruguay", country: "Uruguay", position: "Midfielder", number: 15, birth_date: "1998-07-22", height: 182, weight: 76, fifa_rating: 88, transfer_fee: 0, wages: 120, market_value: 100, preferred_foot: "R", appearances: 6, goals: 2, assists: 1, clean_sheets: 0, yellow_cards: 1, red_cards: 0, minutes_played: 520, fantasy_points: 72, fantasy_value: 8.5 },
  { id: "p_nunez", name: "Darwin Nunez", team_id: "uruguay", country: "Uruguay", position: "Forward", number: 11, birth_date: "1999-06-24", height: 187, weight: 81, fifa_rating: 82, transfer_fee: 80, wages: 100, market_value: 55, preferred_foot: "R", appearances: 5, goals: 3, assists: 0, clean_sheets: 0, yellow_cards: 2, red_cards: 0, minutes_played: 380, fantasy_points: 65, fantasy_value: 7 },
  { id: "p_rochet", name: "Sergio Rochet", team_id: "uruguay", country: "Uruguay", position: "Goalkeeper", number: 1, birth_date: "1993-03-23", height: 190, weight: 84, fifa_rating: 79, transfer_fee: 0, wages: 5, market_value: 3, preferred_foot: "R", appearances: 6, goals: 0, assists: 0, clean_sheets: 2, yellow_cards: 0, red_cards: 0, minutes_played: 540, fantasy_points: 45, fantasy_value: 4 },
  { id: "p_gabriel_m", name: "Gabriel Magalhaes", team_id: "arsenal", country: "Brazil", position: "Defender", number: 6, birth_date: "1997-12-19", height: 190, weight: 87, fifa_rating: 86, transfer_fee: 26, wages: 140, market_value: 75, preferred_foot: "L", appearances: 34, goals: 4, assists: 0, clean_sheets: 15, yellow_cards: 4, red_cards: 0, minutes_played: 3010, fantasy_points: 145, fantasy_value: 6 },
  { id: "p_white", name: "Ben White", team_id: "arsenal", country: "England", position: "Defender", number: 4, birth_date: "1997-10-08", height: 186, weight: 78, fifa_rating: 84, transfer_fee: 50, wages: 120, market_value: 45, preferred_foot: "R", appearances: 32, goals: 2, assists: 5, clean_sheets: 12, yellow_cards: 6, red_cards: 0, minutes_played: 2700, fantasy_points: 121, fantasy_value: 5.5 },
  { id: "p_rice", name: "Declan Rice", team_id: "arsenal", country: "England", position: "Midfielder", number: 41, birth_date: "1999-01-14", height: 185, weight: 80, fifa_rating: 87, transfer_fee: 105, wages: 240, market_value: 110, preferred_foot: "R", appearances: 37, goals: 3, assists: 5, clean_sheets: 0, yellow_cards: 5, red_cards: 1, minutes_played: 3250, fantasy_points: 130, fantasy_value: 7.5 },
  { id: "p_havertz", name: "Kai Havertz", team_id: "arsenal", country: "Germany", position: "Forward", number: 29, birth_date: "1999-06-11", height: 193, weight: 83, fifa_rating: 83, transfer_fee: 75, wages: 280, market_value: 65, preferred_foot: "L", appearances: 37, goals: 13, assists: 7, clean_sheets: 0, yellow_cards: 4, red_cards: 0, minutes_played: 2900, fantasy_points: 158, fantasy_value: 8 },
  { id: "p_martinelli", name: "Gabriel Martinelli", team_id: "arsenal", country: "Brazil", position: "Forward", number: 11, birth_date: "2001-06-18", height: 178, weight: 72, fifa_rating: 84, transfer_fee: 0, wages: 120, market_value: 70, preferred_foot: "R", appearances: 33, goals: 6, assists: 4, clean_sheets: 0, yellow_cards: 2, red_cards: 0, minutes_played: 2100, fantasy_points: 98, fantasy_value: 6.5 },
  { id: "p_trossard", name: "Leandro Trossard", team_id: "arsenal", country: "Belgium", position: "Forward", number: 19, birth_date: "1994-12-04", height: 172, weight: 66, fifa_rating: 81, transfer_fee: 24, wages: 80, market_value: 30, preferred_foot: "R", appearances: 34, goals: 7, assists: 5, clean_sheets: 0, yellow_cards: 3, red_cards: 0, minutes_played: 1800, fantasy_points: 103, fantasy_value: 5 },
  { id: "p_partey", name: "Thomas Partey", team_id: "arsenal", country: "Ghana", position: "Midfielder", number: 5, birth_date: "1993-06-13", height: 185, weight: 77, fifa_rating: 83, transfer_fee: 50, wages: 180, market_value: 18, preferred_foot: "R", appearances: 30, goals: 2, assists: 2, clean_sheets: 0, yellow_cards: 6, red_cards: 0, minutes_played: 2300, fantasy_points: 72, fantasy_value: 4 },
  { id: "p_timber", name: "Jurrien Timber", team_id: "arsenal", country: "Netherlands", position: "Defender", number: 12, birth_date: "2001-06-17", height: 179, weight: 76, fifa_rating: 81, transfer_fee: 40, wages: 120, market_value: 45, preferred_foot: "R", appearances: 25, goals: 2, assists: 2, clean_sheets: 8, yellow_cards: 3, red_cards: 0, minutes_played: 1950, fantasy_points: 82, fantasy_value: 5 },
  { id: "p_foden", name: "Phil Foden", team_id: "man_city", country: "England", position: "Forward", number: 47, birth_date: "2000-05-28", height: 171, weight: 69, fifa_rating: 88, transfer_fee: 0, wages: 280, market_value: 130, preferred_foot: "L", appearances: 32, goals: 9, assists: 7, clean_sheets: 0, yellow_cards: 2, red_cards: 0, minutes_played: 2350, fantasy_points: 140, fantasy_value: 9.5 },
  { id: "p_silva", name: "Bernardo Silva", team_id: "man_city", country: "Portugal", position: "Midfielder", number: 20, birth_date: "1994-08-10", height: 173, weight: 64, fifa_rating: 88, transfer_fee: 50, wages: 250, market_value: 60, preferred_foot: "L", appearances: 33, goals: 4, assists: 6, clean_sheets: 0, yellow_cards: 4, red_cards: 0, minutes_played: 2600, fantasy_points: 108, fantasy_value: 7 },
  { id: "p_dias", name: "Ruben Dias", team_id: "man_city", country: "Portugal", position: "Defender", number: 3, birth_date: "1997-05-14", height: 187, weight: 82, fifa_rating: 88, transfer_fee: 68, wages: 200, market_value: 60, preferred_foot: "R", appearances: 28, goals: 1, assists: 1, clean_sheets: 9, yellow_cards: 3, red_cards: 0, minutes_played: 2400, fantasy_points: 92, fantasy_value: 5.5 },
  { id: "p_grealish", name: "Jack Grealish", team_id: "man_city", country: "England", position: "Midfielder", number: 10, birth_date: "1995-09-10", height: 180, weight: 72, fifa_rating: 84, transfer_fee: 100, wages: 250, market_value: 45, preferred_foot: "R", appearances: 26, goals: 3, assists: 5, clean_sheets: 0, yellow_cards: 5, red_cards: 0, minutes_played: 1650, fantasy_points: 78, fantasy_value: 6 },
  { id: "p_doku", name: "Jeremy Doku", team_id: "man_city", country: "Belgium", position: "Forward", number: 11, birth_date: "2002-05-27", height: 173, weight: 68, fifa_rating: 82, transfer_fee: 60, wages: 90, market_value: 65, preferred_foot: "R", appearances: 23, goals: 4, assists: 7, clean_sheets: 0, yellow_cards: 2, red_cards: 0, minutes_played: 1300, fantasy_points: 85, fantasy_value: 7 },
  { id: "p_stones", name: "John Stones", team_id: "man_city", country: "England", position: "Defender", number: 5, birth_date: "1994-05-28", height: 188, weight: 78, fifa_rating: 84, transfer_fee: 48, wages: 250, market_value: 30, preferred_foot: "R", appearances: 20, goals: 1, assists: 2, clean_sheets: 6, yellow_cards: 2, red_cards: 0, minutes_played: 1550, fantasy_points: 62, fantasy_value: 4.5 },
  { id: "p_nunez_l", name: "Darwin Nunez", team_id: "liverpool", country: "Uruguay", position: "Forward", number: 9, birth_date: "1999-06-24", height: 187, weight: 81, fifa_rating: 82, transfer_fee: 80, wages: 180, market_value: 55, preferred_foot: "R", appearances: 32, goals: 11, assists: 8, clean_sheets: 0, yellow_cards: 6, red_cards: 1, minutes_played: 1900, fantasy_points: 125, fantasy_value: 7.5 },
  { id: "p_szoboszlai", name: "Dominik Szoboszlai", team_id: "liverpool", country: "Hungary", position: "Midfielder", number: 8, birth_date: "2000-10-25", height: 186, weight: 74, fifa_rating: 84, transfer_fee: 70, wages: 190, market_value: 75, preferred_foot: "R", appearances: 30, goals: 4, assists: 6, clean_sheets: 0, yellow_cards: 3, red_cards: 0, minutes_played: 2400, fantasy_points: 103, fantasy_value: 7 },
  { id: "p_macallister", name: "Alexis Mac Allister", team_id: "liverpool", country: "Argentina", position: "Midfielder", number: 10, birth_date: "1998-12-24", height: 176, weight: 72, fifa_rating: 85, transfer_fee: 42, wages: 130, market_value: 80, preferred_foot: "R", appearances: 33, goals: 5, assists: 7, clean_sheets: 0, yellow_cards: 8, red_cards: 0, minutes_played: 2700, fantasy_points: 115, fantasy_value: 7 },
  { id: "p_arnold", name: "Trent Alexander-Arnold", team_id: "liverpool", country: "England", position: "Defender", number: 66, birth_date: "1998-10-07", height: 180, weight: 72, fifa_rating: 86, transfer_fee: 0, wages: 220, market_value: 70, preferred_foot: "R", appearances: 28, goals: 2, assists: 12, clean_sheets: 8, yellow_cards: 6, red_cards: 0, minutes_played: 2400, fantasy_points: 123, fantasy_value: 7 },
  { id: "p_konate", name: "Ibrahima Konate", team_id: "liverpool", country: "France", position: "Defender", number: 5, birth_date: "1999-05-25", height: 194, weight: 85, fifa_rating: 84, transfer_fee: 40, wages: 120, market_value: 50, preferred_foot: "R", appearances: 26, goals: 2, assists: 1, clean_sheets: 10, yellow_cards: 5, red_cards: 1, minutes_played: 2150, fantasy_points: 92, fantasy_value: 5.5 },
  { id: "p_diaz", name: "Luis Diaz", team_id: "liverpool", country: "Colombia", position: "Forward", number: 7, birth_date: "1997-01-13", height: 180, weight: 71, fifa_rating: 84, transfer_fee: 47, wages: 120, market_value: 75, preferred_foot: "R", appearances: 34, goals: 12, assists: 5, clean_sheets: 0, yellow_cards: 3, red_cards: 0, minutes_played: 2350, fantasy_points: 137, fantasy_value: 8 },
  { id: "p_jota", name: "Diogo Jota", team_id: "liverpool", country: "Portugal", position: "Forward", number: 20, birth_date: "1996-12-04", height: 178, weight: 72, fifa_rating: 83, transfer_fee: 45, wages: 140, market_value: 50, preferred_foot: "R", appearances: 25, goals: 10, assists: 3, clean_sheets: 0, yellow_cards: 2, red_cards: 0, minutes_played: 1600, fantasy_points: 98, fantasy_value: 6.5 },
  { id: "p_kelleher_l", name: "Caoimhin Kelleher", team_id: "liverpool", country: "Ireland", position: "Goalkeeper", number: 62, birth_date: "1998-11-23", height: 188, weight: 82, fifa_rating: 79, transfer_fee: 0, wages: 25, market_value: 22, preferred_foot: "R", appearances: 15, goals: 0, assists: 0, clean_sheets: 4, yellow_cards: 1, red_cards: 0, minutes_played: 1350, fantasy_points: 48, fantasy_value: 4 },
  { id: "p_enzo", name: "Enzo Fernandez", team_id: "chelsea", country: "Argentina", position: "Midfielder", number: 8, birth_date: "2001-01-17", height: 178, weight: 75, fifa_rating: 84, transfer_fee: 121, wages: 250, market_value: 75, preferred_foot: "R", appearances: 31, goals: 3, assists: 6, clean_sheets: 0, yellow_cards: 7, red_cards: 0, minutes_played: 2450, fantasy_points: 96, fantasy_value: 6.5 },
  { id: "p_caicedo", name: "Moises Caicedo", team_id: "chelsea", country: "Ecuador", position: "Midfielder", number: 25, birth_date: "2001-11-02", height: 178, weight: 73, fifa_rating: 83, transfer_fee: 115, wages: 180, market_value: 80, preferred_foot: "R", appearances: 36, goals: 2, assists: 4, clean_sheets: 0, yellow_cards: 10, red_cards: 0, minutes_played: 3050, fantasy_points: 91, fantasy_value: 6 },
  { id: "p_gusto", name: "Malo Gusto", team_id: "chelsea", country: "France", position: "Defender", number: 27, birth_date: "2003-05-19", height: 179, weight: 74, fifa_rating: 80, transfer_fee: 30, wages: 80, market_value: 40, preferred_foot: "R", appearances: 27, goals: 0, assists: 6, clean_sheets: 5, yellow_cards: 4, red_cards: 0, minutes_played: 2150, fantasy_points: 75, fantasy_value: 5 },
  { id: "p_colwill", name: "Levi Colwill", team_id: "chelsea", country: "England", position: "Defender", number: 6, birth_date: "2003-02-26", height: 187, weight: 80, fifa_rating: 79, transfer_fee: 0, wages: 60, market_value: 55, preferred_foot: "L", appearances: 25, goals: 1, assists: 1, clean_sheets: 5, yellow_cards: 4, red_cards: 0, minutes_played: 2050, fantasy_points: 68, fantasy_value: 5 },
  { id: "p_sanchez_r", name: "Robert Sanchez", team_id: "chelsea", country: "Spain", position: "Goalkeeper", number: 1, birth_date: "1997-11-18", height: 197, weight: 90, fifa_rating: 80, transfer_fee: 25, wages: 80, market_value: 20, preferred_foot: "R", appearances: 21, goals: 0, assists: 0, clean_sheets: 5, yellow_cards: 2, red_cards: 0, minutes_played: 1860, fantasy_points: 58, fantasy_value: 4.5 },
  { id: "p_madueke", name: "Noni Madueke", team_id: "chelsea", country: "England", position: "Forward", number: 11, birth_date: "2002-03-12", height: 182, weight: 73, fifa_rating: 79, transfer_fee: 32, wages: 50, market_value: 35, preferred_foot: "L", appearances: 28, goals: 8, assists: 4, clean_sheets: 0, yellow_cards: 3, red_cards: 0, minutes_played: 1700, fantasy_points: 102, fantasy_value: 5.5 },
  { id: "p_neto_chelsea", name: "Pedro Neto", team_id: "chelsea", country: "Portugal", position: "Forward", number: 7, birth_date: "2000-03-09", height: 173, weight: 62, fifa_rating: 83, transfer_fee: 60, wages: 150, market_value: 55, preferred_foot: "L", appearances: 22, goals: 3, assists: 7, clean_sheets: 0, yellow_cards: 2, red_cards: 0, minutes_played: 1450, fantasy_points: 78, fantasy_value: 6 },
  { id: "p_honlund", name: "Rasmus Hojlund", team_id: "man_utd", country: "Denmark", position: "Forward", number: 9, birth_date: "2003-02-04", height: 191, weight: 82, fifa_rating: 80, transfer_fee: 72, wages: 120, market_value: 60, preferred_foot: "L", appearances: 30, goals: 10, assists: 2, clean_sheets: 0, yellow_cards: 2, red_cards: 0, minutes_played: 2100, fantasy_points: 102, fantasy_value: 6.5 },
  { id: "p_garnacho", name: "Alejandro Garnacho", team_id: "man_utd", country: "Argentina", position: "Forward", number: 17, birth_date: "2004-07-01", height: 180, weight: 72, fifa_rating: 82, transfer_fee: 0, wages: 50, market_value: 55, preferred_foot: "R", appearances: 36, goals: 7, assists: 4, clean_sheets: 0, yellow_cards: 4, red_cards: 0, minutes_played: 2400, fantasy_points: 103, fantasy_value: 6.5 },
  { id: "p_mainoo", name: "Kobbie Mainoo", team_id: "man_utd", country: "England", position: "Midfielder", number: 37, birth_date: "2005-04-19", height: 175, weight: 70, fifa_rating: 81, transfer_fee: 0, wages: 30, market_value: 60, preferred_foot: "R", appearances: 24, goals: 3, assists: 2, clean_sheets: 0, yellow_cards: 3, red_cards: 0, minutes_played: 1850, fantasy_points: 63, fantasy_value: 6 },
  { id: "p_martinez_l", name: "Lisandro Martinez", team_id: "man_utd", country: "Argentina", position: "Defender", number: 6, birth_date: "1998-01-18", height: 175, weight: 77, fifa_rating: 83, transfer_fee: 57, wages: 160, market_value: 50, preferred_foot: "L", appearances: 25, goals: 1, assists: 1, clean_sheets: 6, yellow_cards: 6, red_cards: 0, minutes_played: 1950, fantasy_points: 65, fantasy_value: 5 },
  { id: "p_dalot", name: "Diogo Dalot", team_id: "man_utd", country: "Portugal", position: "Defender", number: 20, birth_date: "1999-03-18", height: 183, weight: 76, fifa_rating: 81, transfer_fee: 22, wages: 80, market_value: 42, preferred_foot: "R", appearances: 35, goals: 2, assists: 4, clean_sheets: 7, yellow_cards: 5, red_cards: 0, minutes_played: 3e3, fantasy_points: 95, fantasy_value: 5 },
  { id: "p_onana", name: "Andre Onana", team_id: "man_utd", country: "Cameroon", position: "Goalkeeper", number: 24, birth_date: "1996-04-02", height: 190, weight: 93, fifa_rating: 84, transfer_fee: 50, wages: 180, market_value: 38, preferred_foot: "R", appearances: 38, goals: 0, assists: 0, clean_sheets: 8, yellow_cards: 5, red_cards: 0, minutes_played: 3420, fantasy_points: 98, fantasy_value: 5 },
  { id: "p_kulusevski", name: "Dejan Kulusevski", team_id: "tottenham", country: "Sweden", position: "Forward", number: 21, birth_date: "2000-04-25", height: 186, weight: 78, fifa_rating: 83, transfer_fee: 45, wages: 120, market_value: 55, preferred_foot: "L", appearances: 33, goals: 7, assists: 6, clean_sheets: 0, yellow_cards: 3, red_cards: 0, minutes_played: 2450, fantasy_points: 112, fantasy_value: 7 },
  { id: "p_romero", name: "Cristian Romero", team_id: "tottenham", country: "Argentina", position: "Defender", number: 17, birth_date: "1998-04-27", height: 185, weight: 79, fifa_rating: 84, transfer_fee: 50, wages: 150, market_value: 65, preferred_foot: "R", appearances: 26, goals: 4, assists: 1, clean_sheets: 6, yellow_cards: 7, red_cards: 1, minutes_played: 2100, fantasy_points: 88, fantasy_value: 5.5 },
  { id: "p_porro", name: "Pedro Porro", team_id: "tottenham", country: "Spain", position: "Defender", number: 23, birth_date: "1999-09-13", height: 173, weight: 71, fifa_rating: 82, transfer_fee: 45, wages: 100, market_value: 55, preferred_foot: "R", appearances: 32, goals: 3, assists: 6, clean_sheets: 6, yellow_cards: 5, red_cards: 0, minutes_played: 2700, fantasy_points: 107, fantasy_value: 5.5 },
  { id: "p_vicario", name: "Guglielmo Vicario", team_id: "tottenham", country: "Italy", position: "Goalkeeper", number: 13, birth_date: "1996-10-07", height: 194, weight: 83, fifa_rating: 84, transfer_fee: 20, wages: 70, market_value: 35, preferred_foot: "R", appearances: 35, goals: 0, assists: 0, clean_sheets: 8, yellow_cards: 2, red_cards: 0, minutes_played: 3120, fantasy_points: 90, fantasy_value: 5 },
  { id: "p_udogie", name: "Destiny Udogie", team_id: "tottenham", country: "Italy", position: "Defender", number: 38, birth_date: "2002-11-28", height: 188, weight: 80, fifa_rating: 81, transfer_fee: 18, wages: 50, market_value: 45, preferred_foot: "L", appearances: 28, goals: 1, assists: 3, clean_sheets: 4, yellow_cards: 5, red_cards: 1, minutes_played: 2350, fantasy_points: 72, fantasy_value: 5 },
  { id: "p_johnson_b", name: "Brennan Johnson", team_id: "tottenham", country: "Wales", position: "Forward", number: 22, birth_date: "2001-05-23", height: 185, weight: 78, fifa_rating: 80, transfer_fee: 48, wages: 70, market_value: 48, preferred_foot: "R", appearances: 32, goals: 5, assists: 10, clean_sheets: 0, yellow_cards: 2, red_cards: 0, minutes_played: 2300, fantasy_points: 116, fantasy_value: 6 },
  { id: "p_isak", name: "Alexander Isak", team_id: "newcastle", country: "Sweden", position: "Forward", number: 14, birth_date: "1999-09-21", height: 192, weight: 82, fifa_rating: 86, transfer_fee: 70, wages: 160, market_value: 100, preferred_foot: "R", appearances: 30, goals: 21, assists: 2, clean_sheets: 0, yellow_cards: 1, red_cards: 0, minutes_played: 2350, fantasy_points: 164, fantasy_value: 9 },
  { id: "p_guimaraes", name: "Bruno Guimaraes", team_id: "newcastle", country: "Brazil", position: "Midfielder", number: 39, birth_date: "1997-11-16", height: 182, weight: 74, fifa_rating: 85, transfer_fee: 42, wages: 200, market_value: 85, preferred_foot: "R", appearances: 37, goals: 5, assists: 8, clean_sheets: 0, yellow_cards: 9, red_cards: 0, minutes_played: 3200, fantasy_points: 127, fantasy_value: 7.5 },
  { id: "p_gordon", name: "Anthony Gordon", team_id: "newcastle", country: "England", position: "Forward", number: 10, birth_date: "2001-02-24", height: 182, weight: 73, fifa_rating: 83, transfer_fee: 45, wages: 170, market_value: 65, preferred_foot: "R", appearances: 35, goals: 11, assists: 10, clean_sheets: 0, yellow_cards: 10, red_cards: 0, minutes_played: 2850, fantasy_points: 153, fantasy_value: 8 },
  { id: "p_botman", name: "Sven Botman", team_id: "newcastle", country: "Netherlands", position: "Defender", number: 4, birth_date: "2000-01-12", height: 193, weight: 90, fifa_rating: 83, transfer_fee: 37, wages: 110, market_value: 45, preferred_foot: "L", appearances: 22, goals: 2, assists: 2, clean_sheets: 7, yellow_cards: 2, red_cards: 0, minutes_played: 1850, fantasy_points: 78, fantasy_value: 5 },
  { id: "p_trippier", name: "Kieran Trippier", team_id: "newcastle", country: "England", position: "Defender", number: 2, birth_date: "1990-09-19", height: 178, weight: 69, fifa_rating: 82, transfer_fee: 12, wages: 120, market_value: 12, preferred_foot: "R", appearances: 28, goals: 1, assists: 8, clean_sheets: 8, yellow_cards: 3, red_cards: 0, minutes_played: 2300, fantasy_points: 88, fantasy_value: 4 },
  { id: "p_pope", name: "Nick Pope", team_id: "newcastle", country: "England", position: "Goalkeeper", number: 22, birth_date: "1992-04-19", height: 198, weight: 88, fifa_rating: 83, transfer_fee: 10, wages: 100, market_value: 15, preferred_foot: "R", appearances: 30, goals: 0, assists: 0, clean_sheets: 8, yellow_cards: 1, red_cards: 0, minutes_played: 2650, fantasy_points: 78, fantasy_value: 5 },
  { id: "p_joelinton", name: "Joelinton", team_id: "newcastle", country: "Brazil", position: "Midfielder", number: 7, birth_date: "1996-08-14", height: 186, weight: 81, fifa_rating: 82, transfer_fee: 44, wages: 150, market_value: 42, preferred_foot: "R", appearances: 32, goals: 4, assists: 3, clean_sheets: 0, yellow_cards: 12, red_cards: 0, minutes_played: 2550, fantasy_points: 87, fantasy_value: 5 },
  { id: "p_watkins", name: "Ollie Watkins", team_id: "aston_villa", country: "England", position: "Forward", number: 11, birth_date: "1995-12-30", height: 180, weight: 75, fifa_rating: 85, transfer_fee: 0, wages: 160, market_value: 65, preferred_foot: "R", appearances: 37, goals: 19, assists: 13, clean_sheets: 0, yellow_cards: 4, red_cards: 0, minutes_played: 3100, fantasy_points: 197, fantasy_value: 9 },
  { id: "p_mcginn", name: "John McGinn", team_id: "aston_villa", country: "Scotland", position: "Midfielder", number: 7, birth_date: "1994-10-18", height: 178, weight: 75, fifa_rating: 81, transfer_fee: 0, wages: 100, market_value: 28, preferred_foot: "R", appearances: 35, goals: 3, assists: 5, clean_sheets: 0, yellow_cards: 8, red_cards: 1, minutes_played: 2900, fantasy_points: 89, fantasy_value: 4.5 },
  { id: "p_martinez_av", name: "Emiliano Martinez", team_id: "aston_villa", country: "Argentina", position: "Goalkeeper", number: 1, birth_date: "1992-09-02", height: 195, weight: 91, fifa_rating: 87, transfer_fee: 20, wages: 160, market_value: 28, preferred_foot: "R", appearances: 36, goals: 0, assists: 0, clean_sheets: 9, yellow_cards: 2, red_cards: 0, minutes_played: 3240, fantasy_points: 96, fantasy_value: 5.5 },
  { id: "p_bailey", name: "Leon Bailey", team_id: "aston_villa", country: "Jamaica", position: "Forward", number: 31, birth_date: "1997-08-09", height: 178, weight: 72, fifa_rating: 81, transfer_fee: 32, wages: 100, market_value: 35, preferred_foot: "L", appearances: 34, goals: 10, assists: 9, clean_sheets: 0, yellow_cards: 4, red_cards: 0, minutes_played: 2200, fantasy_points: 127, fantasy_value: 6.5 },
  { id: "p_tielemans", name: "Youri Tielemans", team_id: "aston_villa", country: "Belgium", position: "Midfielder", number: 8, birth_date: "1997-05-07", height: 176, weight: 72, fifa_rating: 81, transfer_fee: 0, wages: 150, market_value: 25, preferred_foot: "R", appearances: 34, goals: 2, assists: 7, clean_sheets: 0, yellow_cards: 5, red_cards: 0, minutes_played: 2600, fantasy_points: 91, fantasy_value: 5 },
  { id: "p_pau", name: "Pau Torres", team_id: "aston_villa", country: "Spain", position: "Defender", number: 14, birth_date: "1997-01-16", height: 191, weight: 80, fifa_rating: 83, transfer_fee: 38, wages: 120, market_value: 45, preferred_foot: "L", appearances: 29, goals: 2, assists: 1, clean_sheets: 7, yellow_cards: 2, red_cards: 0, minutes_played: 2450, fantasy_points: 85, fantasy_value: 5.5 },
  { id: "p_ferguson", name: "Evan Ferguson", team_id: "brighton", country: "Ireland", position: "Forward", number: 28, birth_date: "2004-10-19", height: 188, weight: 78, fifa_rating: 79, transfer_fee: 0, wages: 25, market_value: 55, preferred_foot: "R", appearances: 22, goals: 6, assists: 1, clean_sheets: 0, yellow_cards: 1, red_cards: 0, minutes_played: 1200, fantasy_points: 65, fantasy_value: 6 },
  { id: "p_adigra", name: "Simon Adingra", team_id: "brighton", country: "Ivory Coast", position: "Forward", number: 24, birth_date: "2002-01-01", height: 175, weight: 68, fifa_rating: 78, transfer_fee: 0, wages: 15, market_value: 35, preferred_foot: "R", appearances: 30, goals: 6, assists: 4, clean_sheets: 0, yellow_cards: 2, red_cards: 0, minutes_played: 1800, fantasy_points: 86, fantasy_value: 5 },
  { id: "p_gilmour", name: "Billy Gilmour", team_id: "brighton", country: "Scotland", position: "Midfielder", number: 11, birth_date: "2001-06-11", height: 168, weight: 63, fifa_rating: 78, transfer_fee: 0, wages: 30, market_value: 18, preferred_foot: "R", appearances: 28, goals: 1, assists: 3, clean_sheets: 0, yellow_cards: 5, red_cards: 0, minutes_played: 2e3, fantasy_points: 58, fantasy_value: 4 },
  { id: "p_alvarez", name: "Edson Alvarez", team_id: "west_ham", country: "Mexico", position: "Midfielder", number: 19, birth_date: "1997-10-24", height: 187, weight: 76, fifa_rating: 82, transfer_fee: 35, wages: 100, market_value: 35, preferred_foot: "R", appearances: 28, goals: 1, assists: 2, clean_sheets: 0, yellow_cards: 10, red_cards: 1, minutes_played: 2200, fantasy_points: 62, fantasy_value: 4.5 },
  { id: "p_antonio", name: "Michail Antonio", team_id: "west_ham", country: "Jamaica", position: "Forward", number: 9, birth_date: "1990-03-28", height: 180, weight: 82, fifa_rating: 79, transfer_fee: 0, wages: 80, market_value: 10, preferred_foot: "R", appearances: 26, goals: 7, assists: 3, clean_sheets: 0, yellow_cards: 3, red_cards: 0, minutes_played: 1600, fantasy_points: 85, fantasy_value: 3.5 },
  { id: "p_wanbissaka", name: "Aaron Wan-Bissaka", team_id: "west_ham", country: "England", position: "Defender", number: 29, birth_date: "1997-11-26", height: 183, weight: 74, fifa_rating: 79, transfer_fee: 15, wages: 80, market_value: 22, preferred_foot: "R", appearances: 25, goals: 0, assists: 3, clean_sheets: 6, yellow_cards: 3, red_cards: 0, minutes_played: 2e3, fantasy_points: 65, fantasy_value: 4 },
  { id: "p_branthwaite", name: "Jarrad Branthwaite", team_id: "everton", country: "England", position: "Defender", number: 32, birth_date: "2002-06-27", height: 195, weight: 82, fifa_rating: 81, transfer_fee: 0, wages: 30, market_value: 50, preferred_foot: "L", appearances: 32, goals: 3, assists: 1, clean_sheets: 8, yellow_cards: 6, red_cards: 0, minutes_played: 2750, fantasy_points: 98, fantasy_value: 5.5 },
  { id: "p_harrison", name: "Jack Harrison", team_id: "everton", country: "England", position: "Midfielder", number: 11, birth_date: "1996-11-20", height: 175, weight: 71, fifa_rating: 78, transfer_fee: 0, wages: 60, market_value: 15, preferred_foot: "L", appearances: 33, goals: 4, assists: 4, clean_sheets: 0, yellow_cards: 3, red_cards: 0, minutes_played: 2400, fantasy_points: 82, fantasy_value: 4 },
  { id: "p_gueye", name: "Idrissa Gueye", team_id: "everton", country: "Senegal", position: "Midfielder", number: 27, birth_date: "1989-09-26", height: 174, weight: 66, fifa_rating: 80, transfer_fee: 0, wages: 100, market_value: 8, preferred_foot: "R", appearances: 28, goals: 1, assists: 1, clean_sheets: 0, yellow_cards: 6, red_cards: 0, minutes_played: 2200, fantasy_points: 55, fantasy_value: 3 },
  { id: "p_iwobi", name: "Alex Iwobi", team_id: "fulham", country: "Nigeria", position: "Midfielder", number: 22, birth_date: "1996-05-03", height: 183, weight: 75, fifa_rating: 79, transfer_fee: 0, wages: 70, market_value: 25, preferred_foot: "R", appearances: 34, goals: 6, assists: 5, clean_sheets: 0, yellow_cards: 3, red_cards: 0, minutes_played: 2800, fantasy_points: 102, fantasy_value: 5 },
  { id: "p_willian", name: "Willian", team_id: "fulham", country: "Brazil", position: "Forward", number: 20, birth_date: "1988-08-09", height: 175, weight: 71, fifa_rating: 79, transfer_fee: 0, wages: 0, market_value: 8, preferred_foot: "R", appearances: 27, goals: 4, assists: 4, clean_sheets: 0, yellow_cards: 1, red_cards: 0, minutes_played: 1800, fantasy_points: 72, fantasy_value: 3 },
  { id: "p_adarabioyo", name: "Tosin Adarabioyo", team_id: "fulham", country: "England", position: "Defender", number: 4, birth_date: "1997-09-24", height: 196, weight: 79, fifa_rating: 80, transfer_fee: 0, wages: 0, market_value: 20, preferred_foot: "R", appearances: 28, goals: 2, assists: 0, clean_sheets: 6, yellow_cards: 3, red_cards: 0, minutes_played: 2450, fantasy_points: 80, fantasy_value: 4.5 },
  { id: "p_guehi", name: "Marc Guehi", team_id: "crystal_palace", country: "England", position: "Defender", number: 6, birth_date: "2000-07-13", height: 182, weight: 77, fifa_rating: 83, transfer_fee: 0, wages: 70, market_value: 55, preferred_foot: "R", appearances: 32, goals: 1, assists: 1, clean_sheets: 7, yellow_cards: 4, red_cards: 0, minutes_played: 2800, fantasy_points: 87, fantasy_value: 5.5 },
  { id: "p_wharton", name: "Adam Wharton", team_id: "crystal_palace", country: "England", position: "Midfielder", number: 20, birth_date: "2004-02-06", height: 182, weight: 70, fifa_rating: 78, transfer_fee: 0, wages: 25, market_value: 35, preferred_foot: "L", appearances: 28, goals: 1, assists: 3, clean_sheets: 0, yellow_cards: 5, red_cards: 0, minutes_played: 2200, fantasy_points: 65, fantasy_value: 5 },
  { id: "p_mitchell", name: "Tyrick Mitchell", team_id: "crystal_palace", country: "England", position: "Defender", number: 3, birth_date: "1999-09-01", height: 181, weight: 72, fifa_rating: 79, transfer_fee: 0, wages: 20, market_value: 22, preferred_foot: "L", appearances: 35, goals: 1, assists: 3, clean_sheets: 7, yellow_cards: 3, red_cards: 0, minutes_played: 3050, fantasy_points: 82, fantasy_value: 4.5 },
  { id: "p_wissa", name: "Yoane Wissa", team_id: "brentford", country: "DR Congo", position: "Forward", number: 11, birth_date: "1996-09-03", height: 178, weight: 72, fifa_rating: 80, transfer_fee: 0, wages: 35, market_value: 28, preferred_foot: "R", appearances: 34, goals: 12, assists: 3, clean_sheets: 0, yellow_cards: 2, red_cards: 0, minutes_played: 2400, fantasy_points: 114, fantasy_value: 6 },
  { id: "p_janelt", name: "Vitaly Janelt", team_id: "brentford", country: "Germany", position: "Midfielder", number: 27, birth_date: "1998-05-10", height: 184, weight: 77, fifa_rating: 78, transfer_fee: 0, wages: 20, market_value: 22, preferred_foot: "L", appearances: 32, goals: 2, assists: 2, clean_sheets: 0, yellow_cards: 5, red_cards: 0, minutes_played: 2550, fantasy_points: 65, fantasy_value: 4 },
  { id: "p_henry", name: "Rico Henry", team_id: "brentford", country: "England", position: "Defender", number: 3, birth_date: "1997-07-08", height: 174, weight: 73, fifa_rating: 80, transfer_fee: 0, wages: 0, market_value: 30, preferred_foot: "L", appearances: 5, goals: 0, assists: 1, clean_sheets: 1, yellow_cards: 0, red_cards: 0, minutes_played: 380, fantasy_points: 12, fantasy_value: 4 },
  { id: "p_elanga", name: "Anthony Elanga", team_id: "nottingham_forest", country: "Sweden", position: "Forward", number: 21, birth_date: "2002-04-27", height: 178, weight: 73, fifa_rating: 79, transfer_fee: 15, wages: 35, market_value: 25, preferred_foot: "R", appearances: 34, goals: 5, assists: 8, clean_sheets: 0, yellow_cards: 3, red_cards: 0, minutes_played: 2200, fantasy_points: 96, fantasy_value: 5 },
  { id: "p_yates", name: "Ryan Yates", team_id: "nottingham_forest", country: "England", position: "Midfielder", number: 22, birth_date: "1997-11-21", height: 184, weight: 83, fifa_rating: 77, transfer_fee: 0, wages: 25, market_value: 12, preferred_foot: "R", appearances: 34, goals: 3, assists: 2, clean_sheets: 0, yellow_cards: 8, red_cards: 0, minutes_played: 2700, fantasy_points: 72, fantasy_value: 3.5 },
  { id: "p_murillo_", name: "Murillo", team_id: "nottingham_forest", country: "Brazil", position: "Defender", number: 40, birth_date: "2002-07-04", height: 184, weight: 80, fifa_rating: 79, transfer_fee: 12, wages: 20, market_value: 40, preferred_foot: "L", appearances: 32, goals: 1, assists: 1, clean_sheets: 6, yellow_cards: 5, red_cards: 0, minutes_played: 2700, fantasy_points: 80, fantasy_value: 5 },
  { id: "p_gomes_j", name: "Joao Gomes", team_id: "wolves", country: "Brazil", position: "Midfielder", number: 8, birth_date: "2001-02-12", height: 176, weight: 72, fifa_rating: 80, transfer_fee: 0, wages: 40, market_value: 35, preferred_foot: "R", appearances: 34, goals: 2, assists: 1, clean_sheets: 0, yellow_cards: 8, red_cards: 0, minutes_played: 2750, fantasy_points: 65, fantasy_value: 4.5 },
  { id: "p_heech", name: "Hwang Hee-chan", team_id: "wolves", country: "South Korea", position: "Forward", number: 11, birth_date: "1996-01-26", height: 177, weight: 74, fifa_rating: 80, transfer_fee: 0, wages: 70, market_value: 28, preferred_foot: "R", appearances: 25, goals: 10, assists: 3, clean_sheets: 0, yellow_cards: 3, red_cards: 0, minutes_played: 1700, fantasy_points: 98, fantasy_value: 5.5 },
  { id: "p_semedo", name: "Nelson Semedo", team_id: "wolves", country: "Portugal", position: "Defender", number: 22, birth_date: "1993-11-16", height: 180, weight: 76, fifa_rating: 79, transfer_fee: 37, wages: 90, market_value: 20, preferred_foot: "R", appearances: 34, goals: 0, assists: 2, clean_sheets: 5, yellow_cards: 4, red_cards: 0, minutes_played: 2900, fantasy_points: 71, fantasy_value: 4 },
  { id: "p_kluivert", name: "Justin Kluivert", team_id: "bournemouth", country: "Netherlands", position: "Forward", number: 19, birth_date: "1999-05-05", height: 172, weight: 66, fifa_rating: 78, transfer_fee: 12, wages: 30, market_value: 18, preferred_foot: "R", appearances: 32, goals: 7, assists: 3, clean_sheets: 0, yellow_cards: 6, red_cards: 0, minutes_played: 2e3, fantasy_points: 92, fantasy_value: 4.5 },
  { id: "p_zabarnyi", name: "Illya Zabarnyi", team_id: "bournemouth", country: "Ukraine", position: "Defender", number: 27, birth_date: "2002-09-01", height: 189, weight: 80, fifa_rating: 79, transfer_fee: 0, wages: 15, market_value: 30, preferred_foot: "R", appearances: 36, goals: 1, assists: 1, clean_sheets: 7, yellow_cards: 3, red_cards: 0, minutes_played: 3180, fantasy_points: 92, fantasy_value: 5 },
  { id: "p_cook", name: "Lewis Cook", team_id: "bournemouth", country: "England", position: "Midfielder", number: 4, birth_date: "1997-02-03", height: 175, weight: 71, fifa_rating: 77, transfer_fee: 0, wages: 20, market_value: 15, preferred_foot: "R", appearances: 33, goals: 1, assists: 3, clean_sheets: 0, yellow_cards: 7, red_cards: 0, minutes_played: 2600, fantasy_points: 65, fantasy_value: 3.5 },
  { id: "p_semenyo", name: "Antoine Semenyo", team_id: "bournemouth", country: "Ghana", position: "Forward", number: 24, birth_date: "2000-01-07", height: 182, weight: 78, fifa_rating: 79, transfer_fee: 0, wages: 15, market_value: 28, preferred_foot: "R", appearances: 33, goals: 8, assists: 4, clean_sheets: 0, yellow_cards: 2, red_cards: 0, minutes_played: 2300, fantasy_points: 105, fantasy_value: 5.5 },
  { id: "p_ndidi", name: "Wilfred Ndidi", team_id: "leicester", country: "Nigeria", position: "Midfielder", number: 25, birth_date: "1996-12-16", height: 183, weight: 77, fifa_rating: 79, transfer_fee: 0, wages: 60, market_value: 20, preferred_foot: "R", appearances: 32, goals: 2, assists: 2, clean_sheets: 0, yellow_cards: 7, red_cards: 0, minutes_played: 2600, fantasy_points: 68, fantasy_value: 4 },
  { id: "p_justin", name: "James Justin", team_id: "leicester", country: "England", position: "Defender", number: 2, birth_date: "1998-02-23", height: 183, weight: 77, fifa_rating: 78, transfer_fee: 0, wages: 20, market_value: 22, preferred_foot: "R", appearances: 28, goals: 2, assists: 2, clean_sheets: 5, yellow_cards: 4, red_cards: 0, minutes_played: 2350, fantasy_points: 72, fantasy_value: 4.5 },
  { id: "p_faes", name: "Wout Faes", team_id: "leicester", country: "Belgium", position: "Defender", number: 3, birth_date: "1998-04-03", height: 187, weight: 82, fifa_rating: 78, transfer_fee: 0, wages: 25, market_value: 20, preferred_foot: "R", appearances: 35, goals: 2, assists: 1, clean_sheets: 6, yellow_cards: 5, red_cards: 0, minutes_played: 3050, fantasy_points: 80, fantasy_value: 4.5 },
  { id: "p_adams", name: "Che Adams", team_id: "southampton", country: "Scotland", position: "Forward", number: 10, birth_date: "1996-07-13", height: 183, weight: 78, fifa_rating: 77, transfer_fee: 0, wages: 20, market_value: 15, preferred_foot: "R", appearances: 38, goals: 13, assists: 4, clean_sheets: 0, yellow_cards: 2, red_cards: 0, minutes_played: 2900, fantasy_points: 121, fantasy_value: 4 },
  { id: "p_smallbone", name: "Will Smallbone", team_id: "southampton", country: "Ireland", position: "Midfielder", number: 16, birth_date: "2000-02-21", height: 175, weight: 68, fifa_rating: 75, transfer_fee: 0, wages: 8, market_value: 12, preferred_foot: "R", appearances: 42, goals: 5, assists: 6, clean_sheets: 0, yellow_cards: 4, red_cards: 0, minutes_played: 3400, fantasy_points: 98, fantasy_value: 3 },
  { id: "p_bednarek", name: "Jan Bednarek", team_id: "southampton", country: "Poland", position: "Defender", number: 35, birth_date: "1996-04-12", height: 189, weight: 79, fifa_rating: 76, transfer_fee: 0, wages: 10, market_value: 10, preferred_foot: "R", appearances: 40, goals: 2, assists: 1, clean_sheets: 10, yellow_cards: 6, red_cards: 0, minutes_played: 3500, fantasy_points: 100, fantasy_value: 3.5 },
  { id: "p_flynn", name: "Ryan Fraser", team_id: "southampton", country: "Scotland", position: "Midfielder", number: 24, birth_date: "1994-02-24", height: 163, weight: 58, fifa_rating: 75, transfer_fee: 0, wages: 0, market_value: 8, preferred_foot: "R", appearances: 38, goals: 6, assists: 8, clean_sheets: 0, yellow_cards: 4, red_cards: 0, minutes_played: 2800, fantasy_points: 102, fantasy_value: 3 },
  { id: "p_burns", name: "Wes Burns", team_id: "ipswich", country: "Wales", position: "Midfielder", number: 7, birth_date: "1994-11-23", height: 173, weight: 70, fifa_rating: 72, transfer_fee: 0, wages: 5, market_value: 5, preferred_foot: "R", appearances: 40, goals: 6, assists: 8, clean_sheets: 0, yellow_cards: 4, red_cards: 0, minutes_played: 3100, fantasy_points: 96, fantasy_value: 2.5 },
  { id: "p_burgess", name: "Cameron Burgess", team_id: "ipswich", country: "Australia", position: "Defender", number: 15, birth_date: "1995-10-21", height: 194, weight: 84, fifa_rating: 73, transfer_fee: 0, wages: 5, market_value: 4, preferred_foot: "L", appearances: 42, goals: 3, assists: 1, clean_sheets: 12, yellow_cards: 6, red_cards: 0, minutes_played: 3700, fantasy_points: 98, fantasy_value: 2.5 },
  { id: "p_broadhead", name: "Nathan Broadhead", team_id: "ipswich", country: "Wales", position: "Forward", number: 33, birth_date: "1998-04-05", height: 178, weight: 70, fifa_rating: 74, transfer_fee: 0, wages: 8, market_value: 6, preferred_foot: "R", appearances: 38, goals: 13, assists: 6, clean_sheets: 0, yellow_cards: 2, red_cards: 0, minutes_played: 2800, fantasy_points: 120, fantasy_value: 3 },
  { id: "p_debruyne_be", name: "Kevin De Bruyne", team_id: "belgium", country: "Belgium", position: "Midfielder", number: 7, birth_date: "1991-06-28", height: 181, weight: 75, fifa_rating: 90, transfer_fee: 70, wages: 400, market_value: 50, preferred_foot: "R", appearances: 5, goals: 1, assists: 3, clean_sheets: 0, yellow_cards: 1, red_cards: 0, minutes_played: 420, fantasy_points: 52, fantasy_value: 10.5 },
  { id: "p_lukaku", name: "Romelu Lukaku", team_id: "belgium", country: "Belgium", position: "Forward", number: 9, birth_date: "1993-05-13", height: 191, weight: 93, fifa_rating: 84, transfer_fee: 0, wages: 380, market_value: 25, preferred_foot: "L", appearances: 5, goals: 4, assists: 1, clean_sheets: 0, yellow_cards: 1, red_cards: 0, minutes_played: 410, fantasy_points: 62, fantasy_value: 7 },
  { id: "p_courtois_be", name: "Thibaut Courtois", team_id: "belgium", country: "Belgium", position: "Goalkeeper", number: 1, birth_date: "1992-05-11", height: 200, weight: 96, fifa_rating: 90, transfer_fee: 35, wages: 250, market_value: 25, preferred_foot: "L", appearances: 4, goals: 0, assists: 0, clean_sheets: 2, yellow_cards: 0, red_cards: 0, minutes_played: 360, fantasy_points: 27, fantasy_value: 6 },
  { id: "p_doku_be", name: "Jeremy Doku", team_id: "belgium", country: "Belgium", position: "Forward", number: 11, birth_date: "2002-05-27", height: 173, weight: 68, fifa_rating: 82, transfer_fee: 60, wages: 90, market_value: 65, preferred_foot: "R", appearances: 4, goals: 1, assists: 2, clean_sheets: 0, yellow_cards: 1, red_cards: 0, minutes_played: 280, fantasy_points: 32, fantasy_value: 7 },
  { id: "p_tielemans_be", name: "Youri Tielemans", team_id: "belgium", country: "Belgium", position: "Midfielder", number: 8, birth_date: "1997-05-07", height: 176, weight: 72, fifa_rating: 81, transfer_fee: 0, wages: 150, market_value: 25, preferred_foot: "R", appearances: 5, goals: 0, assists: 1, clean_sheets: 0, yellow_cards: 1, red_cards: 0, minutes_played: 400, fantasy_points: 18, fantasy_value: 5 },
  { id: "p_donnarumma", name: "Gianluigi Donnarumma", team_id: "italy", country: "Italy", position: "Goalkeeper", number: 1, birth_date: "1999-02-25", height: 196, weight: 90, fifa_rating: 87, transfer_fee: 0, wages: 250, market_value: 40, preferred_foot: "R", appearances: 5, goals: 0, assists: 0, clean_sheets: 2, yellow_cards: 0, red_cards: 0, minutes_played: 450, fantasy_points: 35, fantasy_value: 6 },
  { id: "p_bastoni", name: "Alessandro Bastoni", team_id: "italy", country: "Italy", position: "Defender", number: 23, birth_date: "1999-04-13", height: 190, weight: 81, fifa_rating: 85, transfer_fee: 0, wages: 100, market_value: 70, preferred_foot: "L", appearances: 5, goals: 0, assists: 0, clean_sheets: 2, yellow_cards: 1, red_cards: 0, minutes_played: 450, fantasy_points: 42, fantasy_value: 6.5 },
  { id: "p_barella_it", name: "Nicolo Barella", team_id: "italy", country: "Italy", position: "Midfielder", number: 18, birth_date: "1997-02-07", height: 172, weight: 68, fifa_rating: 86, transfer_fee: 45, wages: 190, market_value: 80, preferred_foot: "R", appearances: 5, goals: 1, assists: 2, clean_sheets: 0, yellow_cards: 1, red_cards: 0, minutes_played: 420, fantasy_points: 48, fantasy_value: 7 },
  { id: "p_chiesa", name: "Federico Chiesa", team_id: "italy", country: "Italy", position: "Forward", number: 14, birth_date: "1997-10-25", height: 175, weight: 71, fifa_rating: 82, transfer_fee: 0, wages: 130, market_value: 40, preferred_foot: "R", appearances: 4, goals: 2, assists: 1, clean_sheets: 0, yellow_cards: 0, red_cards: 0, minutes_played: 320, fantasy_points: 44, fantasy_value: 6 }
];

// server/index.ts
var app = express();
var PORT = Number(process.env.PORT) || 3e3;
var HOST = process.env.HOST || "0.0.0.0";
var CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5177";
var CALLBACK_URL = (() => {
  try {
    return new URL("/auth/google/callback", CLIENT_URL).toString();
  } catch {
    const base = CLIENT_URL.endsWith("/") ? CLIENT_URL.slice(0, -1) : CLIENT_URL;
    return `${base}/auth/google/callback`;
  }
})();
var SESSION_SECRET = process.env.SESSION_SECRET || "dev_secret";
var OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
var RESEND_API_KEY = process.env.RESEND_API_KEY || "";
var MONGODB_URI = process.env.MONGODB_URI || "";
var ODDS_API_KEY = process.env.ODDS_API_KEY || "";
var ODDS_API_SPORTS = (process.env.ODDS_API_SPORTS || "soccer_epl,soccer_spain_la_liga,soccer_germany_bundesliga,soccer_italy_serie_a,soccer_uefa_champs_league,soccer_fifa_world_cup").split(",").map((s) => s.trim()).filter(Boolean);
var DATA_DIR = process.env.DATA_DIR || ".";
var db = new Database(path.join(DATA_DIR, "data.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  picture TEXT
);
CREATE TABLE IF NOT EXISTS leagues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  country TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  leagueId TEXT NOT NULL,
  matchDate INTEGER NOT NULL,
  homeTeamName TEXT NOT NULL,
  awayTeamName TEXT NOT NULL,
  homeWinOdds REAL,
  drawOdds REAL,
  awayWinOdds REAL,
  FOREIGN KEY (leagueId) REFERENCES leagues(id)
);
CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY,
  matchId TEXT NOT NULL UNIQUE,
  prediction TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  reasoning TEXT,
  FOREIGN KEY (matchId) REFERENCES matches(id)
);
CREATE TABLE IF NOT EXISTS user_preferences (
  userId TEXT PRIMARY KEY,
  preferredLeagues TEXT NOT NULL,
  emailNotifications INTEGER NOT NULL,
  riskTolerance TEXT NOT NULL,
  timezone TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS watchlist (
  userId TEXT NOT NULL,
  matchId TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  PRIMARY KEY (userId, matchId),
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (matchId) REFERENCES matches(id)
);
CREATE TABLE IF NOT EXISTS match_details (
  matchId TEXT PRIMARY KEY,
  details TEXT NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (matchId) REFERENCES matches(id)
);
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  league TEXT NOT NULL,
  logo_url TEXT
);
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  team_id TEXT NOT NULL,
  country TEXT NOT NULL,
  position TEXT NOT NULL,
  number INTEGER,
  birth_date TEXT,
  height INTEGER,
  weight INTEGER,
  fifa_rating INTEGER,
  transfer_fee REAL,
  wages REAL,
  market_value REAL,
  preferred_foot TEXT,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);
CREATE TABLE IF NOT EXISTS player_season_stats (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  season TEXT NOT NULL,
  appearances INTEGER NOT NULL DEFAULT 0,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  clean_sheets INTEGER NOT NULL DEFAULT 0,
  yellow_cards INTEGER NOT NULL DEFAULT 0,
  red_cards INTEGER NOT NULL DEFAULT 0,
  minutes_played INTEGER NOT NULL DEFAULT 0,
  fantasy_points INTEGER NOT NULL DEFAULT 0,
  fantasy_value REAL DEFAULT 0,
  FOREIGN KEY (player_id) REFERENCES players(id)
);
`);
var leaguesCount = db.prepare("SELECT COUNT(*) as c FROM leagues").get();
if (leaguesCount.c === 0) {
  const insertLeague = db.prepare("INSERT INTO leagues (id, name, code, country) VALUES (?, ?, ?, ?)");
  insertLeague.run("epl", "Premier League", "EPL", "England");
  insertLeague.run("laliga", "La Liga", "LL", "Spain");
  insertLeague.run("bundesliga", "Bundesliga", "BL", "Germany");
  insertLeague.run("seriea", "Serie A", "SA", "Italy");
}
var wcExists = db.prepare("SELECT 1 FROM leagues WHERE id = ?").get("worldcup");
if (!wcExists) {
  db.prepare("INSERT INTO leagues (id, name, code, country) VALUES (?, ?, ?, ?)").run(
    "worldcup",
    "FIFA World Cup",
    "WC",
    "International"
  );
}
var teamsCount = db.prepare("SELECT COUNT(*) as c FROM teams").get();
if (teamsCount.c === 0) {
  const insertTeam = db.prepare("INSERT INTO teams (id, name, country, league, logo_url) VALUES (?, ?, ?, ?, ?)");
  const insertPlayer = db.prepare("INSERT INTO players (id, name, team_id, country, position, number, birth_date, height, weight, fifa_rating, transfer_fee, wages, market_value, preferred_foot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const insertStats = db.prepare("INSERT INTO player_season_stats (id, player_id, season, appearances, goals, assists, clean_sheets, yellow_cards, red_cards, minutes_played, fantasy_points, fantasy_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const teams = [
    ["arsenal", "Arsenal", "England", "epl"],
    ["chelsea", "Chelsea", "England", "epl"],
    ["liverpool", "Liverpool", "England", "epl"],
    ["man_city", "Manchester City", "England", "epl"],
    ["man_utd", "Manchester United", "England", "epl"],
    ["tottenham", "Tottenham Hotspur", "England", "epl"],
    ["newcastle", "Newcastle United", "England", "epl"],
    ["aston_villa", "Aston Villa", "England", "epl"],
    ["real_madrid", "Real Madrid", "Spain", "laliga"],
    ["barcelona", "Barcelona", "Spain", "laliga"],
    ["atletico", "Atletico Madrid", "Spain", "laliga"],
    ["sevilla", "Sevilla", "Spain", "laliga"],
    ["bayern", "Bayern Munich", "Germany", "bundesliga"],
    ["dortmund", "Borussia Dortmund", "Germany", "bundesliga"],
    ["leipzig", "RB Leipzig", "Germany", "bundesliga"],
    ["leverkusen", "Bayer Leverkusen", "Germany", "bundesliga"],
    ["inter", "Inter Milan", "Italy", "seriea"],
    ["juventus", "Juventus", "Italy", "seriea"],
    ["ac_milan", "AC Milan", "Italy", "seriea"],
    ["napoli", "Napoli", "Italy", "seriea"],
    ["brazil", "Brazil", "Brazil", "worldcup"],
    ["argentina", "Argentina", "Argentina", "worldcup"],
    ["france", "France", "France", "worldcup"],
    ["england", "England", "England", "worldcup"],
    ["germany", "Germany", "Germany", "worldcup"],
    ["spain", "Spain", "Spain", "worldcup"]
  ];
  for (const t of teams) insertTeam.run(t[0], t[1], t[2], t[3], null);
  const players = [
    ["p_saka", "Bukayo Saka", "arsenal", "England", "Forward", 7, "2001-09-05", 178, 72, 88, 0, 250, 150, "L", 35, 16, 9, 0, 4, 0, 2800, 185, 12.5],
    ["p_odegaard", "Martin Odegaard", "arsenal", "Norway", "Midfielder", 8, "1998-12-17", 178, 70, 89, 35, 220, 110, "L", 35, 8, 10, 0, 2, 0, 2900, 152, 9.5],
    ["p_saliba", "William Saliba", "arsenal", "France", "Defender", 2, "2001-03-24", 192, 84, 87, 30, 130, 80, "R", 38, 2, 1, 18, 5, 0, 3200, 142, 6.5],
    ["p_raya", "David Raya", "arsenal", "Spain", "Goalkeeper", 22, "1995-09-15", 183, 80, 85, 30, 120, 35, "R", 32, 0, 0, 16, 2, 0, 2850, 128, 5.5],
    ["p_haaland", "Erling Haaland", "man_city", "Norway", "Forward", 9, "2000-07-21", 194, 88, 91, 60, 450, 200, "L", 31, 27, 5, 0, 1, 0, 2550, 228, 14],
    ["p_debruyne", "Kevin De Bruyne", "man_city", "Belgium", "Midfielder", 17, "1991-06-28", 181, 75, 90, 70, 400, 50, "R", 18, 4, 10, 0, 1, 0, 1400, 142, 10.5],
    ["p_rodri", "Rodri", "man_city", "Spain", "Midfielder", 16, "1996-06-22", 190, 82, 91, 70, 300, 130, "R", 34, 9, 9, 0, 10, 1, 2900, 158, 7],
    ["p_ederson", "Ederson", "man_city", "Brazil", "Goalkeeper", 31, "1993-08-17", 188, 86, 88, 40, 150, 35, "L", 33, 0, 0, 13, 5, 0, 2940, 121, 5.5],
    ["p_salah", "Mohamed Salah", "liverpool", "Egypt", "Forward", 11, "1992-06-15", 175, 71, 89, 42, 400, 55, "L", 32, 18, 10, 0, 2, 0, 2680, 211, 12.5],
    ["p_vandijk", "Virgil van Dijk", "liverpool", "Netherlands", "Defender", 4, "1991-07-08", 193, 92, 89, 75, 260, 28, "R", 36, 2, 2, 12, 3, 1, 3180, 162, 6.5],
    ["p_alisson", "Alisson Becker", "liverpool", "Brazil", "Goalkeeper", 1, "1992-10-02", 191, 91, 89, 62, 180, 28, "R", 28, 0, 0, 8, 2, 0, 2480, 109, 5.5],
    ["p_palmer", "Cole Palmer", "chelsea", "England", "Midfielder", 20, "2002-05-06", 185, 74, 87, 0, 150, 130, "L", 34, 22, 11, 0, 7, 0, 2700, 236, 10],
    ["p_jackson", "Nicolas Jackson", "chelsea", "Senegal", "Forward", 15, "2001-06-20", 187, 79, 82, 37, 130, 55, "R", 35, 14, 5, 0, 9, 0, 2400, 145, 7.5],
    ["p_fernandes", "Bruno Fernandes", "man_utd", "Portugal", "Midfielder", 8, "1994-09-08", 179, 69, 87, 65, 300, 65, "R", 35, 10, 8, 0, 9, 1, 3050, 153, 9.5],
    ["p_rashford", "Marcus Rashford", "man_utd", "England", "Forward", 10, "1997-10-31", 180, 72, 84, 0, 300, 50, "R", 33, 7, 5, 0, 2, 1, 2250, 98, 8],
    ["p_son", "Son Heung-min", "tottenham", "South Korea", "Forward", 7, "1992-07-08", 184, 78, 87, 30, 250, 38, "B", 35, 17, 10, 0, 2, 0, 2900, 196, 11],
    ["p_maddison", "James Maddison", "tottenham", "England", "Midfielder", 10, "1996-11-23", 175, 73, 85, 45, 190, 60, "R", 28, 4, 9, 0, 5, 0, 2100, 114, 8],
    ["p_vinicius", "Vinicius Junior", "real_madrid", "Brazil", "Forward", 7, "2000-07-12", 176, 68, 91, 0, 350, 200, "R", 26, 15, 6, 0, 7, 0, 1950, 175, 12],
    ["p_bellingham", "Jude Bellingham", "real_madrid", "England", "Midfielder", 5, "2003-06-29", 186, 75, 91, 103, 340, 180, "R", 28, 19, 6, 0, 5, 1, 2300, 192, 10.5],
    ["p_courtois", "Thibaut Courtois", "real_madrid", "Belgium", "Goalkeeper", 1, "1992-05-11", 200, 96, 90, 35, 250, 25, "L", 31, 0, 0, 12, 2, 0, 2760, 121, 6],
    ["p_lewa", "Robert Lewandowski", "barcelona", "Poland", "Forward", 9, "1988-08-21", 185, 81, 90, 50, 380, 15, "R", 35, 19, 8, 0, 5, 0, 2800, 208, 12],
    ["p_terstegen", "Marc-Andre ter Stegen", "barcelona", "Germany", "Goalkeeper", 1, "1992-04-30", 187, 85, 89, 10, 200, 20, "R", 28, 0, 0, 10, 1, 0, 2500, 97, 5.5],
    ["p_kane", "Harry Kane", "bayern", "England", "Forward", 9, "1993-07-28", 188, 89, 91, 100, 420, 90, "R", 32, 36, 8, 0, 2, 0, 2700, 251, 13.5],
    ["p_musiala", "Jamal Musiala", "bayern", "Germany", "Midfielder", 42, "2003-02-26", 183, 72, 88, 0, 180, 140, "R", 24, 10, 6, 0, 1, 0, 1720, 138, 8.5],
    ["p_neuer", "Manuel Neuer", "bayern", "Germany", "Goalkeeper", 1, "1986-03-27", 193, 92, 87, 0, 170, 4, "R", 23, 0, 0, 5, 0, 0, 2040, 62, 5],
    ["p_lautaro", "Lautaro Martinez", "inter", "Argentina", "Forward", 10, "1997-08-22", 174, 72, 88, 25, 220, 100, "R", 33, 24, 6, 0, 3, 0, 2700, 200, 11.5],
    ["p_barella", "Nicolo Barella", "inter", "Italy", "Midfielder", 23, "1997-02-07", 172, 68, 86, 45, 190, 80, "R", 37, 2, 7, 0, 7, 0, 3100, 120, 7],
    ["p_vlahovic", "Dusan Vlahovic", "juventus", "Serbia", "Forward", 9, "2000-01-28", 190, 83, 84, 80, 210, 65, "L", 33, 16, 3, 0, 6, 0, 2400, 153, 9.5],
    ["p_fuellkrug", "Niclas Fullkrug", "dortmund", "Germany", "Forward", 14, "1993-02-09", 189, 84, 81, 15, 110, 15, "R", 29, 12, 8, 0, 2, 0, 2100, 120, 7],
    ["p_neymar", "Neymar Jr", "brazil", "Brazil", "Forward", 10, "1992-02-05", 175, 68, 89, 90, 400, 20, "R", 2, 1, 2, 0, 0, 0, 180, 17, 9],
    ["p_alisson_br", "Alisson Becker", "brazil", "Brazil", "Goalkeeper", 1, "1992-10-02", 191, 91, 89, 62, 180, 28, "R", 8, 0, 0, 3, 0, 0, 720, 29, 5.5],
    ["p_messi", "Lionel Messi", "argentina", "Argentina", "Forward", 10, "1987-06-24", 170, 72, 88, 0, 500, 25, "L", 7, 6, 3, 0, 0, 0, 620, 65, 11],
    ["p_emartinez", "Emiliano Martinez", "argentina", "Argentina", "Goalkeeper", 23, "1992-09-02", 195, 91, 87, 25, 160, 28, "R", 8, 0, 0, 4, 1, 0, 750, 42, 5.5],
    ["p_mbappe", "Kylian Mbappe", "france", "France", "Forward", 10, "1998-12-20", 178, 73, 91, 0, 600, 180, "R", 8, 8, 2, 0, 0, 0, 720, 72, 13],
    ["p_kane_en", "Harry Kane", "england", "England", "Forward", 9, "1993-07-28", 188, 89, 91, 100, 420, 90, "R", 8, 7, 2, 0, 1, 0, 700, 59, 13.5],
    ["p_pickford", "Jordan Pickford", "england", "England", "Goalkeeper", 1, "1994-03-07", 185, 77, 83, 25, 80, 22, "L", 8, 0, 0, 3, 1, 0, 750, 35, 5]
  ];
  const season = "2024-25";
  for (const p of players) {
    insertPlayer.run(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13]);
    insertStats.run("s_" + p[0], p[0], season, p[15], p[16], p[17], p[18], p[19], p[20], p[21], p[22], p[23]);
  }
  for (const t of seedTeams) {
    insertTeam.run(t.id, t.name, t.country, t.league, null);
  }
  for (const p of seedPlayers) {
    insertPlayer.run(p.id, p.name, p.team_id, p.country, p.position, p.number, p.birth_date, p.height, p.weight, p.fifa_rating, p.transfer_fee, p.wages, p.market_value, p.preferred_foot);
    insertStats.run("s_" + p.id, p.id, season, p.appearances, p.goals, p.assists, p.clean_sheets, p.yellow_cards, p.red_cards, p.minutes_played, p.fantasy_points, p.fantasy_value);
  }
}
(() => {
  const insertTeam = db.prepare("INSERT OR IGNORE INTO teams (id, name, country, league, logo_url) VALUES (?, ?, ?, ?, ?)");
  const insertPlayer = db.prepare("INSERT OR IGNORE INTO players (id, name, team_id, country, position, number, birth_date, height, weight, fifa_rating, transfer_fee, wages, market_value, preferred_foot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const insertStats = db.prepare("INSERT OR IGNORE INTO player_season_stats (id, player_id, season, appearances, goals, assists, clean_sheets, yellow_cards, red_cards, minutes_played, fantasy_points, fantasy_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const season = "2024-25";
  for (const t of seedTeams) insertTeam.run(t.id, t.name, t.country, t.league, null);
  for (const p of seedPlayers) {
    insertPlayer.run(p.id, p.name, p.team_id, p.country, p.position, p.number, p.birth_date, p.height, p.weight, p.fifa_rating, p.transfer_fee, p.wages, p.market_value, p.preferred_foot);
    insertStats.run("s_" + p.id, p.id, season, p.appearances, p.goals, p.assists, p.clean_sheets, p.yellow_cards, p.red_cards, p.minutes_played, p.fantasy_points, p.fantasy_value);
  }
})();
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: CLIENT_URL.startsWith("https"),
      sameSite: CLIENT_URL.startsWith("https") ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1e3
      // 7 days
    },
    proxy: true
  })
);
app.use(passport.initialize());
app.use(passport.session());
try {
  db.exec("ALTER TABLE users ADD COLUMN picture TEXT");
} catch {
}
try {
  db.exec("ALTER TABLE players ADD COLUMN fifa_rating INTEGER");
} catch {
}
try {
  db.exec("ALTER TABLE players ADD COLUMN transfer_fee REAL");
} catch {
}
try {
  db.exec("ALTER TABLE players ADD COLUMN wages REAL");
} catch {
}
try {
  db.exec("ALTER TABLE players ADD COLUMN market_value REAL");
} catch {
}
try {
  db.exec("ALTER TABLE players ADD COLUMN preferred_foot TEXT");
} catch {
}
try {
  db.exec("ALTER TABLE player_season_stats ADD COLUMN minutes_played INTEGER DEFAULT 0");
} catch {
}
try {
  db.exec("ALTER TABLE player_season_stats ADD COLUMN fantasy_points INTEGER DEFAULT 0");
} catch {
}
try {
  db.exec("ALTER TABLE player_season_stats ADD COLUMN fantasy_value REAL DEFAULT 0");
} catch {
}
var mongoClient = null;
async function getMongoDb() {
  if (!MONGODB_URI) return null;
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
  }
  return mongoClient.db();
}
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  const user = db.prepare("SELECT id, email, name, picture FROM users WHERE id = ?").get(id);
  done(null, user || null);
});
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: CALLBACK_URL,
        skipProfile: true
      },
      async (accessToken, refreshToken, _profile, done) => {
        try {
          let userinfo = null;
          const endpoints = [
            "https://www.googleapis.com/oauth2/v3/userinfo",
            "https://www.googleapis.com/oauth2/v2/userinfo"
          ];
          for (const url of endpoints) {
            try {
              const r = await fetch(url, {
                headers: { Authorization: `Bearer ${accessToken}` }
              });
              if (r.ok) {
                userinfo = await r.json();
                break;
              }
            } catch {
            }
          }
          if (!userinfo) return done(new Error("Failed to fetch Google userinfo"));
          const email = userinfo.email;
          const id = userinfo.sub || userinfo.id;
          const name = userinfo.name || [userinfo.given_name, userinfo.family_name].filter(Boolean).join(" ");
          const picture = userinfo.picture || null;
          if (!email || !id) return done(new Error("Email or id missing from Google profile"));
          const upsert = db.prepare(`
            INSERT INTO users (id, email, name, picture) VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET email=excluded.email, name=excluded.name, picture=excluded.picture
          `);
          upsert.run(id, email, name || null, picture);
          const user = db.prepare("SELECT id, email, name, picture FROM users WHERE id = ?").get(id);
          return done(null, user);
        } catch (e) {
          return done(e);
        }
      }
    )
  );
}
app.get("/auth/google", (req, res, next) => {
  if (!passport._strategy("google")) {
    return res.status(500).send("Google OAuth not configured");
  }
  return passport.authenticate("google", { scope: ["openid", "email", "profile"] })(req, res, next);
});
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${CLIENT_URL}/?auth=failed`,
    session: true
  }),
  (req, res) => {
    res.redirect(CLIENT_URL);
  }
);
app.post("/auth/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });
});
function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
app.get("/api/me", (req, res) => {
  res.json(req.user || null);
});
app.get("/api/leagues", (req, res) => {
  const leagues = db.prepare("SELECT id, name, code, country FROM leagues").all();
  res.json(leagues);
});
app.get("/api/matches/upcoming", async (req, res) => {
  const { leagueId, days } = req.query;
  const now = Date.now();
  const until = now + Number(days || 7) * 24 * 60 * 60 * 1e3;
  if (ODDS_API_KEY) {
    try {
      db.prepare(`DELETE FROM matches WHERE homeTeamName LIKE 'Team %' AND awayTeamName LIKE 'Team %'`).run();
      await fetchAndUpsertLiveOdds({ days: Number(days || 7) });
    } catch {
    }
  }
  let rows;
  if (leagueId) {
    rows = db.prepare(
      `SELECT m.*, l.name as leagueName, l.code as leagueCode, l.country as leagueCountry
       FROM matches m JOIN leagues l ON l.id = m.leagueId
       WHERE m.leagueId = ? AND m.matchDate BETWEEN ? AND ?
       ORDER BY m.matchDate ASC`
    ).all(leagueId, now, until);
  } else {
    rows = db.prepare(
      `SELECT m.*, l.name as leagueName, l.code as leagueCode, l.country as leagueCountry
       FROM matches m JOIN leagues l ON l.id = m.leagueId
       WHERE m.matchDate BETWEEN ? AND ?
       ORDER BY m.matchDate ASC`
    ).all(now, until);
  }
  const isPlaceholder = (name) => !name || /^team\s+/i.test(name) || name.toLowerCase() === "home team" || name.toLowerCase() === "away team";
  const filtered = rows.filter((r) => !(isPlaceholder(r.homeTeamName) || isPlaceholder(r.awayTeamName)));
  const matches = filtered.map((r) => ({
    id: r.id,
    leagueId: r.leagueId,
    league: { id: r.leagueId, name: r.leagueName, code: r.leagueCode, country: r.leagueCountry },
    homeTeam: { id: `${r.id}:home`, name: r.homeTeamName },
    awayTeam: { id: `${r.id}:away`, name: r.awayTeamName },
    matchDate: r.matchDate,
    homeWinOdds: r.homeWinOdds,
    drawOdds: r.drawOdds,
    awayWinOdds: r.awayWinOdds,
    prediction: db.prepare("SELECT id, matchId, prediction, confidence, reasoning FROM predictions WHERE matchId = ?").get(r.id) || null
  }));
  res.json(matches);
});
app.get("/api/predictions/high-confidence", (req, res) => {
  const minConfidence = Number(req.query.minConfidence || 70);
  const limit = Number(req.query.limit || 10);
  db.prepare(
    `DELETE FROM predictions WHERE matchId IN (
      SELECT id FROM matches 
      WHERE LOWER(homeTeamName) LIKE 'team %' 
         OR LOWER(awayTeamName) LIKE 'team %'
         OR LOWER(homeTeamName) IN ('home team') 
         OR LOWER(awayTeamName) IN ('away team')
    )`
  ).run();
  const rows = db.prepare(
    `SELECT 
       p.id as pid, p.matchId, p.prediction as pred, p.confidence as conf, p.reasoning as reason,
       m.id as mid, m.leagueId, m.matchDate, m.homeTeamName, m.awayTeamName, m.homeWinOdds, m.drawOdds, m.awayWinOdds,
       l.name as leagueName, l.code as leagueCode, l.country as leagueCountry
     FROM predictions p
     JOIN matches m ON m.id = p.matchId
     JOIN leagues l ON l.id = m.leagueId
     WHERE p.confidence >= ?
     ORDER BY p.confidence DESC LIMIT ?`
  ).all(minConfidence, limit);
  const isPlaceholder = (name) => {
    if (!name) return true;
    const n = String(name).toLowerCase();
    return /^team\s+/.test(n) || n === "home team" || n === "away team";
  };
  const result = rows.filter((r) => !(isPlaceholder(r.homeTeamName) || isPlaceholder(r.awayTeamName))).map((r) => ({
    prediction: {
      id: r.pid,
      matchId: r.matchId,
      prediction: r.pred,
      confidence: r.conf,
      reasoning: r.reason
    },
    match: {
      id: r.mid,
      leagueId: r.leagueId,
      league: { id: r.leagueId, name: r.leagueName, code: r.leagueCode, country: r.leagueCountry },
      homeTeam: { id: `${r.mid}:home`, name: r.homeTeamName },
      awayTeam: { id: `${r.mid}:away`, name: r.awayTeamName },
      matchDate: r.matchDate,
      homeWinOdds: r.homeWinOdds,
      drawOdds: r.drawOdds,
      awayWinOdds: r.awayWinOdds
    }
  }));
  res.json(result);
});
app.post("/api/predictions/generate", requireUser, async (req, res) => {
  const { matchId } = req.body || {};
  if (!matchId || typeof matchId !== "string") {
    return res.status(400).json({ error: "matchId required" });
  }
  const m = db.prepare("SELECT id, homeTeamName, awayTeamName, homeWinOdds, drawOdds, awayWinOdds FROM matches WHERE id = ?").get(matchId);
  if (!m) {
    return res.status(404).json({ error: "Match not found" });
  }
  const isPlaceholder = (name) => {
    if (!name) return true;
    const n = String(name).toLowerCase();
    return /^team\s+/.test(n) || n === "home team" || n === "away team";
  };
  if (isPlaceholder(m.homeTeamName) || isPlaceholder(m.awayTeamName)) {
    return res.status(400).json({ error: "Predictions disabled for placeholder teams" });
  }
  try {
    const { probs } = await generatePredictionForMatch(m);
    const prediction = db.prepare("SELECT id, matchId, prediction, confidence, reasoning FROM predictions WHERE matchId = ?").get(matchId);
    return res.json({ ok: true, prediction, probs });
  } catch (e) {
    return res.status(500).json({ error: "Failed to generate prediction" });
  }
});
app.post("/api/predictions/generate-bulk", requireUser, async (req, res) => {
  const { matchIds } = req.body || {};
  if (!Array.isArray(matchIds) || matchIds.length === 0) {
    return res.status(400).json({ error: "matchIds array required" });
  }
  const results = {};
  for (const id of matchIds.slice(0, 25)) {
    try {
      const m = db.prepare("SELECT id, homeTeamName, awayTeamName, homeWinOdds, drawOdds, awayWinOdds FROM matches WHERE id = ?").get(id);
      if (!m) {
        results[id] = { error: "Match not found" };
        continue;
      }
      const isPlaceholder = (name) => {
        if (!name) return true;
        const n = String(name).toLowerCase();
        return /^team\s+/.test(n) || n === "home team" || n === "away team";
      };
      if (isPlaceholder(m.homeTeamName) || isPlaceholder(m.awayTeamName)) {
        results[id] = { error: "Placeholder teams" };
        continue;
      }
      const { probs } = await generatePredictionForMatch(m);
      const prediction = db.prepare("SELECT id, matchId, prediction, confidence, reasoning FROM predictions WHERE matchId = ?").get(id);
      results[id] = { prediction, probs };
    } catch {
      results[id] = { error: "Failed" };
    }
  }
  res.json({ ok: true, results });
});
app.get("/api/recommendations/today", (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 1, 1), 7);
  const start = /* @__PURE__ */ new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1e3);
  const rows = db.prepare(
    `SELECT m.*, l.name as leagueName, l.code as leagueCode, l.country as leagueCountry,
            p.id as predictionId, p.prediction as pred, p.confidence as conf, p.reasoning as reason
     FROM matches m
     JOIN leagues l ON l.id = m.leagueId
     LEFT JOIN predictions p ON p.matchId = m.id
     WHERE m.matchDate BETWEEN ? AND ?
     ORDER BY m.matchDate ASC`
  ).all(start.getTime(), end.getTime());
  const isPlaceholder = (name) => !name || /^team\s+/i.test(name) || name.toLowerCase() === "home team" || name.toLowerCase() === "away team";
  const matches = rows.filter((r) => r.predictionId).filter((r) => !(isPlaceholder(r.homeTeamName) || isPlaceholder(r.awayTeamName))).map((r) => {
    const recommendationType = r.conf >= 85 ? "safe" : r.conf >= 70 ? "value" : "risky";
    return {
      match: {
        id: r.id,
        leagueId: r.leagueId,
        league: { id: r.leagueId, name: r.leagueName, code: r.leagueCode, country: r.leagueCountry },
        homeTeam: { id: `${r.id}:home`, name: r.homeTeamName },
        awayTeam: { id: `${r.id}:away`, name: r.awayTeamName },
        matchDate: r.matchDate,
        homeWinOdds: r.homeWinOdds,
        drawOdds: r.drawOdds,
        awayWinOdds: r.awayWinOdds
      },
      prediction: {
        id: r.predictionId,
        matchId: r.id,
        prediction: r.pred,
        confidence: r.conf,
        reasoning: r.reason
      },
      recommendationType
    };
  });
  const averageConfidence = matches.length > 0 ? matches.reduce((sum, x) => sum + x.prediction.confidence, 0) / matches.length : 0;
  res.json({
    totalMatches: matches.length,
    averageConfidence,
    matches
  });
});
app.get("/api/user/preferences", requireUser, (req, res) => {
  const userId = req.user.id;
  const row = db.prepare("SELECT preferredLeagues, emailNotifications, riskTolerance, timezone FROM user_preferences WHERE userId = ?").get(userId);
  if (!row) {
    return res.json({
      preferredLeagues: [],
      emailNotifications: true,
      riskTolerance: "medium",
      timezone: "UTC"
    });
  }
  res.json({
    preferredLeagues: JSON.parse(row.preferredLeagues),
    emailNotifications: !!row.emailNotifications,
    riskTolerance: row.riskTolerance,
    timezone: row.timezone
  });
});
app.post("/api/user/preferences", requireUser, (req, res) => {
  const userId = req.user.id;
  const { preferredLeagues = [], emailNotifications = true, riskTolerance = "medium", timezone = "UTC" } = req.body || {};
  const stmt = db.prepare(`
    INSERT INTO user_preferences (userId, preferredLeagues, emailNotifications, riskTolerance, timezone)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(userId) DO UPDATE SET preferredLeagues=excluded.preferredLeagues, emailNotifications=excluded.emailNotifications, riskTolerance=excluded.riskTolerance, timezone=excluded.timezone
  `);
  stmt.run(userId, JSON.stringify(preferredLeagues), emailNotifications ? 1 : 0, riskTolerance, timezone);
  res.json({ ok: true });
});
app.get("/api/watchlist", requireUser, (req, res) => {
  const userId = req.user.id;
  const rows = db.prepare(
    `SELECT m.*, l.name as leagueName, l.code as leagueCode, l.country as leagueCountry,
            p.id as predictionId, p.prediction as pred, p.confidence as conf, p.reasoning as reason
     FROM watchlist w
     JOIN matches m ON m.id = w.matchId
     JOIN leagues l ON l.id = m.leagueId
     LEFT JOIN predictions p ON p.matchId = m.id
     WHERE w.userId = ?
     ORDER BY m.matchDate ASC`
  ).all(userId);
  const matches = rows.map((r) => ({
    id: r.id,
    leagueId: r.leagueId,
    league: { id: r.leagueId, name: r.leagueName, code: r.leagueCode, country: r.leagueCountry },
    homeTeam: { id: `${r.id}:home`, name: r.homeTeamName },
    awayTeam: { id: `${r.id}:away`, name: r.awayTeamName },
    matchDate: r.matchDate,
    homeWinOdds: r.homeWinOdds,
    drawOdds: r.drawOdds,
    awayWinOdds: r.awayWinOdds,
    prediction: r.predictionId ? { id: r.predictionId, matchId: r.id, prediction: r.pred, confidence: r.conf, reasoning: r.reason } : null
  }));
  res.json(matches);
});
app.post("/api/watchlist", requireUser, (req, res) => {
  const userId = req.user.id;
  const { matchId } = req.body || {};
  if (!matchId) return res.status(400).json({ error: "matchId required" });
  const match = db.prepare("SELECT id FROM matches WHERE id = ?").get(matchId);
  if (!match) return res.status(404).json({ error: "Match not found" });
  try {
    db.prepare("INSERT INTO watchlist (userId, matchId, createdAt) VALUES (?, ?, ?)").run(userId, matchId, Date.now());
    res.json({ ok: true });
  } catch {
    res.status(409).json({ error: "Already in watchlist" });
  }
});
app.delete("/api/watchlist/:matchId", requireUser, (req, res) => {
  const userId = req.user.id;
  db.prepare("DELETE FROM watchlist WHERE userId = ? AND matchId = ?").run(userId, req.params.matchId);
  res.json({ ok: true });
});
app.get("/api/matches/:id/details", requireUser, async (req, res) => {
  const matchId = req.params.id;
  const match = db.prepare(
    `SELECT m.*, l.name as leagueName, l.code as leagueCode, l.country as leagueCountry
     FROM matches m JOIN leagues l ON l.id = m.leagueId WHERE m.id = ?`
  ).get(matchId);
  if (!match) return res.status(404).json({ error: "Match not found" });
  const cached = db.prepare("SELECT details, updatedAt FROM match_details WHERE matchId = ?").get(matchId);
  if (cached && Date.now() - cached.updatedAt < 36e5) {
    const details = JSON.parse(cached.details);
    const isWatchlisted = !!db.prepare("SELECT 1 FROM watchlist WHERE userId = ? AND matchId = ?").get(req.user.id, matchId);
    return res.json({ ...details, isWatchlisted });
  }
  try {
    const details = await generateMatchDetails(match);
    db.prepare("INSERT INTO match_details (matchId, details, updatedAt) VALUES (?, ?, ?) ON CONFLICT(matchId) DO UPDATE SET details=excluded.details, updatedAt=excluded.updatedAt").run(matchId, JSON.stringify(details), Date.now());
    const isWatchlisted = !!db.prepare("SELECT 1 FROM watchlist WHERE userId = ? AND matchId = ?").get(req.user.id, matchId);
    res.json({ ...details, isWatchlisted });
  } catch {
    const fallback = generateFallbackDetails(match);
    const isWatchlisted = !!db.prepare("SELECT 1 FROM watchlist WHERE userId = ? AND matchId = ?").get(req.user.id, matchId);
    res.json({ ...fallback, isWatchlisted });
  }
});
var openai = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1"
});
async function generatePredictionForMatch(match) {
  const priors = await getHistoricalPriors(match.homeTeamName, match.awayTeamName);
  const prompt = `
You are an expert football betting analyst. Given the match and decimal odds, output a JSON with fields: prediction (home|draw|away), confidence (0-100), reasoning (short).
Match: ${match.homeTeamName} vs ${match.awayTeamName}
Odds: home=${match.homeWinOdds ?? "N/A"}, draw=${match.drawOdds ?? "N/A"}, away=${match.awayWinOdds ?? "N/A"}
 Also include 'probs' with keys home, draw, away as integers 0-100 that sum to ~100.
Return only JSON.`;
  try {
    const resp = await openai.chat.completions.create({
      model: "openrouter/auto",
      messages: [
        { role: "system", content: "Return valid strict JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3
    });
    const text = resp.choices[0]?.message?.content || "";
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const json = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    const prediction = (json.prediction || "home").toLowerCase();
    const confidence = Math.max(0, Math.min(100, Number(json.confidence || 70)));
    const reasoning = String(json.reasoning || "");
    let probs;
    if (json.probs && typeof json.probs === "object") {
      const h = Math.max(0, Math.min(100, Number(json.probs.home ?? 0)));
      const d = Math.max(0, Math.min(100, Number(json.probs.draw ?? 0)));
      const a = Math.max(0, Math.min(100, Number(json.probs.away ?? 0)));
      const sum = h + d + a;
      if (sum > 0) {
        probs = {
          home: Math.round(h / sum * 100),
          draw: Math.round(d / sum * 100),
          away: Math.round(a / sum * 100)
        };
      }
    }
    db.prepare(
      `INSERT INTO predictions (id, matchId, prediction, confidence, reasoning)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(matchId) DO UPDATE SET prediction=excluded.prediction, confidence=excluded.confidence, reasoning=excluded.reasoning`
    ).run(`pred_${match.id}`, match.id, prediction, confidence, reasoning);
    if (!probs) {
      const base = { home: 33, draw: 33, away: 34 };
      if (prediction === "home") base.home = confidence;
      else if (prediction === "draw") base.draw = confidence;
      else base.away = confidence;
      const rem = 100 - (prediction === "home" ? base.home : prediction === "draw" ? base.draw : base.away);
      const others = ["home", "draw", "away"].filter((k) => k !== prediction);
      base[others[0]] = Math.round(rem * 0.5);
      base[others[1]] = rem - base[others[0]];
      probs = base;
    }
    const blended = priors ? blendProbs(probs, priors, 0.7) : probs;
    return { probs: blended };
  } catch (e) {
    const outcomes = [
      { key: "home", odds: match.homeWinOdds, name: match.homeTeamName },
      { key: "draw", odds: match.drawOdds, name: "Draw" },
      { key: "away", odds: match.awayWinOdds, name: match.awayTeamName }
    ];
    const available = outcomes.filter((o) => typeof o.odds === "number" && o.odds > 0);
    if (available.length > 0) {
      const implied = available.map((o) => ({ ...o, p: 1 / o.odds }));
      const sum = implied.reduce((s, o) => s + o.p, 0);
      const withConf = implied.map((o) => ({ ...o, conf: Math.round(o.p / sum * 100) }));
      const best = withConf.sort((a, b) => b.conf - a.conf)[0];
      const reasoning = `Odds-based fallback: highest implied probability from odds.`;
      db.prepare(
        `INSERT INTO predictions (id, matchId, prediction, confidence, reasoning)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(matchId) DO UPDATE SET prediction=excluded.prediction, confidence=excluded.confidence, reasoning=excluded.reasoning`
      ).run(`pred_${match.id}`, match.id, best.key, best.conf, reasoning);
      let probs = {
        home: withConf.find((x) => x.key === "home")?.conf ?? 0,
        draw: withConf.find((x) => x.key === "draw")?.conf ?? 0,
        away: withConf.find((x) => x.key === "away")?.conf ?? 0
      };
      if (priors) {
        probs = blendProbs(probs, priors, 0.7);
      }
      return { probs };
    }
    return {};
  }
}
function blendProbs(model, priors, modelWeight) {
  const priorWeight = 1 - modelWeight;
  const h = model.home * modelWeight + priors.home * priorWeight;
  const d = model.draw * modelWeight + priors.draw * priorWeight;
  const a = model.away * modelWeight + priors.away * priorWeight;
  const sum = h + d + a || 1;
  return { home: Math.round(h / sum * 100), draw: Math.round(d / sum * 100), away: Math.round(a / sum * 100) };
}
async function getHistoricalPriors(homeTeamName, awayTeamName) {
  const dbm = await getMongoDb();
  if (!dbm) return null;
  const coll = dbm.collection("match_history");
  const lastN = 20;
  const homeRecent = await coll.find({ $or: [{ homeTeamName }, { awayTeamName: homeTeamName }] }).sort({ date: -1 }).limit(lastN).toArray();
  const awayRecent = await coll.find({ $or: [{ homeTeamName: awayTeamName }, { awayTeamName }] }).sort({ date: -1 }).limit(lastN).toArray();
  const h2h = await coll.find({
    $or: [
      { homeTeamName, awayTeamName },
      { homeTeamName: awayTeamName, awayTeamName: homeTeamName }
    ]
  }).sort({ date: -1 }).limit(10).toArray();
  const pct = (wins, draws, losses) => {
    const total = wins + draws + losses;
    if (!total) return { win: 0, draw: 0, loss: 0 };
    return {
      win: wins / total,
      draw: draws / total,
      loss: losses / total
    };
  };
  const summarize = (games, team) => {
    let wins = 0, draws = 0, losses = 0;
    for (const g of games) {
      const hg = Number(g.homeGoals ?? 0);
      const ag = Number(g.awayGoals ?? 0);
      const isHome = g.homeTeamName === team;
      if (hg === ag) draws++;
      else if (isHome && hg > ag || !isHome && ag > hg) wins++;
      else losses++;
    }
    return pct(wins, draws, losses);
  };
  const homeForm = summarize(homeRecent, homeTeamName);
  const awayForm = summarize(awayRecent, awayTeamName);
  let h2hHome = 0, h2hDraw = 0, h2hAway = 0;
  for (const g of h2h) {
    const hg = Number(g.homeGoals ?? 0);
    const ag = Number(g.awayGoals ?? 0);
    if (hg === ag) h2hDraw++;
    else if (g.homeTeamName === homeTeamName ? hg > ag : ag > hg) h2hHome++;
    else h2hAway++;
  }
  const h2hTotal = h2hHome + h2hDraw + h2hAway || 1;
  const homePrior = 100 * (0.5 * homeForm.win + 0.3 * (1 - awayForm.win) + 0.2 * (h2hHome / h2hTotal));
  const drawPrior = 100 * (0.6 * ((homeForm.draw + awayForm.draw) / 2) + 0.4 * (h2hDraw / h2hTotal));
  const awayPrior = 100 * (0.5 * awayForm.win + 0.3 * (1 - homeForm.win) + 0.2 * (h2hAway / h2hTotal));
  const sum = homePrior + drawPrior + awayPrior || 1;
  return {
    home: Math.round(homePrior / sum * 100),
    draw: Math.round(drawPrior / sum * 100),
    away: Math.round(awayPrior / sum * 100)
  };
}
async function generateMatchDetails(match) {
  const prompt = `You are a football match analyst. Given this match, return ONLY valid JSON.
Match: ${match.homeTeamName} vs ${match.awayTeamName}
League: ${match.leagueName}
Odds: home=${match.homeWinOdds ?? "N/A"}, draw=${match.drawOdds ?? "N/A"}, away=${match.awayWinOdds ?? "N/A"}
Return JSON: {"h2h":{"homeWins":N,"draws":N,"awayWins":N,"summary":"..."},"homeForm":{"results":["W","D","L","W","W"],"summary":"..."},"awayForm":{"results":["L","W","D","L","L"],"summary":"..."},"injuries":{"home":["..."],"away":["..."]},"analysis":"..."}`;
  const resp = await openai.chat.completions.create({
    model: "openrouter/auto",
    messages: [{ role: "system", content: "Return valid strict JSON only." }, { role: "user", content: prompt }],
    temperature: 0.5
  });
  const text = resp.choices[0]?.message?.content || "";
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
}
function generateFallbackDetails(match) {
  const home = match.homeTeamName;
  const away = match.awayTeamName;
  return {
    h2h: { homeWins: 3, draws: 2, awayWins: 2, summary: `${home} hold a slight edge in recent meetings with 3 wins in the last 7 encounters.` },
    homeForm: { results: ["W", "D", "W", "L", "W"], summary: `${home} are in good form with 3 wins in their last 5 matches.` },
    awayForm: { results: ["L", "W", "L", "D", "L"], summary: `${away} have struggled recently, winning only 1 of their last 5.` },
    injuries: { home: ["Midfielder (doubtful)"], away: ["Striker (injured)", "Defender (suspended)"] },
    analysis: `${home} are favorites based on recent form and home advantage. ${away} will need to overcome their poor away record to get a result here.`
  };
}
app.post("/api/history/ingest", requireUser, async (req, res) => {
  try {
    const dbm = await getMongoDb();
    if (!dbm) return res.status(400).json({ error: "MongoDB not configured" });
    const coll = dbm.collection("match_history");
    const items = Array.isArray(req.body) ? req.body : [req.body];
    if (!items.length) return res.status(400).json({ error: "No items provided" });
    for (const it of items) {
      const key = `${it.date}-${it.homeTeamName}-${it.awayTeamName}`;
      await coll.updateOne(
        { _key: key },
        {
          $set: {
            _key: key,
            date: it.date,
            homeTeamName: it.homeTeamName,
            awayTeamName: it.awayTeamName,
            homeGoals: it.homeGoals,
            awayGoals: it.awayGoals,
            competition: it.competition ?? null
          }
        },
        { upsert: true }
      );
    }
    res.json({ ok: true, inserted: items.length });
  } catch (e) {
    res.status(500).json({ error: "Failed to ingest history" });
  }
});
function ensureSampleMatches() {
  if (ODDS_API_KEY) return;
  const now = /* @__PURE__ */ new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const existing = db.prepare("SELECT COUNT(*) as c FROM matches WHERE matchDate BETWEEN ? AND ?").get(
    startOfDay.getTime(),
    endOfDay.getTime()
  );
  if (existing.c > 0) return;
  const leagueIds = db.prepare("SELECT id FROM leagues").all();
  const leagueIdMap = {
    epl: "epl",
    laliga: "laliga",
    bundesliga: "bundesliga",
    seriea: "seriea"
  };
  const hasLeague = (id) => leagueIds.some((l) => l.id === id);
  const fixtures = [];
  if (hasLeague("epl")) {
    fixtures.push(
      { leagueId: leagueIdMap.epl, home: "Arsenal", away: "Chelsea", offsetHours: 3, odds: [1.95, 3.4, 4.1] },
      { leagueId: leagueIdMap.epl, home: "Liverpool", away: "Tottenham", offsetHours: 5, odds: [1.85, 3.6, 4.3] }
    );
  }
  if (hasLeague("laliga")) {
    fixtures.push({ leagueId: leagueIdMap.laliga, home: "Real Madrid", away: "Sevilla", offsetHours: 7, odds: [1.6, 3.8, 5.2] });
  }
  if (hasLeague("bundesliga")) {
    fixtures.push({ leagueId: leagueIdMap.bundesliga, home: "Bayern Munich", away: "Leipzig", offsetHours: 9, odds: [1.7, 4, 4.8] });
  }
  if (hasLeague("seriea")) {
    fixtures.push({ leagueId: leagueIdMap.seriea, home: "Inter", away: "Juventus", offsetHours: 11, odds: [2.2, 3.2, 3.3] });
  }
  if (fixtures.length === 0 && leagueIds.length) {
    fixtures.push({ leagueId: leagueIds[0].id, home: "Team A", away: "Team B", offsetHours: 3, odds: [2, 3.3, 3.8] });
  }
  const insert = db.prepare(`
    INSERT INTO matches (id, leagueId, matchDate, homeTeamName, awayTeamName, homeWinOdds, drawOdds, awayWinOdds)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  fixtures.forEach((f, idx) => {
    const kickoff = new Date(startOfDay.getTime());
    kickoff.setHours(12 + f.offsetHours, 0, 0, 0);
    const id = `m_${startOfDay.getTime()}_${idx}`;
    insert.run(id, f.leagueId, kickoff.getTime(), f.home, f.away, f.odds[0], f.odds[1], f.odds[2]);
  });
}
async function fetchAndUpsertLiveOdds({ days }) {
  const endTs = Date.now() + days * 24 * 60 * 60 * 1e3;
  const leagueMap = {
    soccer_epl: "epl",
    soccer_spain_la_liga: "laliga",
    soccer_germany_bundesliga: "bundesliga",
    soccer_italy_serie_a: "seriea",
    soccer_uefa_champs_league: "ucl",
    soccer_fifa_world_cup: "worldcup"
  };
  for (const sport of ODDS_API_SPORTS) {
    const leagueId = leagueMap[sport];
    if (!leagueId) continue;
    const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds?regions=eu&markets=h2h&oddsFormat=decimal&apiKey=${encodeURIComponent(
      ODDS_API_KEY
    )}`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const events = await resp.json();
      const insert = db.prepare(`
        INSERT INTO matches (id, leagueId, matchDate, homeTeamName, awayTeamName, homeWinOdds, drawOdds, awayWinOdds)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          leagueId=excluded.leagueId,
          matchDate=excluded.matchDate,
          homeTeamName=excluded.homeTeamName,
          awayTeamName=excluded.awayTeamName,
          homeWinOdds=excluded.homeWinOdds,
          drawOdds=excluded.drawOdds,
          awayWinOdds=excluded.awayWinOdds
      `);
      for (const ev of events) {
        const commenceMs = new Date(ev.commence_time).getTime();
        if (commenceMs > endTs) continue;
        const home = ev.home_team;
        const away = ev.away_team;
        let homeOdds;
        let drawOdds;
        let awayOdds;
        const firstBook = (ev.bookmakers || [])[0];
        if (firstBook?.markets?.length) {
          const h2h = firstBook.markets.find((m) => m.key === "h2h");
          if (h2h?.outcomes?.length) {
            for (const o of h2h.outcomes) {
              if (o.name === home) homeOdds = Number(o.price);
              else if (o.name === away) awayOdds = Number(o.price);
              else if (String(o.name).toLowerCase() === "draw") drawOdds = Number(o.price);
            }
          }
        }
        const id = `odds_${sport}_${ev.id}`;
        insert.run(id, leagueId, commenceMs, home, away, homeOdds ?? null, drawOdds ?? null, awayOdds ?? null);
      }
    } catch {
    }
  }
}
app.get("/api/teams", (req, res) => {
  const { search, league } = req.query;
  let sql = "SELECT t.*, l.name as leagueName FROM teams t JOIN leagues l ON l.id = t.league";
  const params = [];
  const conditions = [];
  if (search) {
    conditions.push("t.name LIKE ?");
    params.push(`%${search}%`);
  }
  if (league) {
    conditions.push("t.league = ?");
    params.push(league);
  }
  if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY t.name ASC";
  const rows = db.prepare(sql).all(...params);
  const seen = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const key = r.name.toLowerCase();
    if (!seen.has(key)) seen.set(key, r);
  }
  res.json(Array.from(seen.values()).map((r) => ({ id: r.id, name: r.name, country: r.country, league: r.league, leagueName: r.leagueName, logo_url: r.logo_url, coach: r.coach, formation: r.formation })));
});
app.get("/api/teams/:id", (req, res) => {
  const team = db.prepare("SELECT t.*, l.name as leagueName FROM teams t JOIN leagues l ON l.id = t.league WHERE t.id = ?").get(req.params.id);
  if (!team) return res.status(404).json({ error: "Team not found" });
  const pc = db.prepare("SELECT COUNT(*) as c FROM players WHERE team_id = ?").get(req.params.id).c;
  res.json({ id: team.id, name: team.name, country: team.country, league: team.league, leagueName: team.leagueName, logo_url: team.logo_url, playerCount: pc, coach: team.coach, formation: team.formation });
});
app.get("/api/teams/:id/players", (req, res) => {
  const { position } = req.query;
  let sql = `SELECT p.*, s.appearances, s.goals, s.assists, s.clean_sheets, s.yellow_cards, s.red_cards, s.minutes_played, s.fantasy_points, s.fantasy_value
    FROM players p LEFT JOIN player_season_stats s ON s.player_id = p.id AND s.season = '2024-25'
    WHERE p.team_id = ?`;
  const params = [req.params.id];
  if (position) {
    sql += " AND p.position = ?";
    params.push(position);
  }
  sql += " ORDER BY p.position, p.name ASC";
  const rows = db.prepare(sql).all(...params);
  const seen = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const key = r.name.toLowerCase();
    const existing = seen.get(key);
    if (!existing || (r.appearances || 0) > (existing.appearances || 0)) {
      seen.set(key, r);
    }
  }
  const deduped = Array.from(seen.values());
  res.json(deduped.map((r) => ({
    id: r.id,
    name: r.name,
    team_id: r.team_id,
    teamName: "",
    country: r.country,
    position: r.position,
    number: r.number,
    birth_date: r.birth_date,
    height: r.height,
    weight: r.weight,
    fifa_rating: r.fifa_rating,
    transfer_fee: r.transfer_fee,
    wages: r.wages,
    market_value: r.market_value,
    preferred_foot: r.preferred_foot,
    stats: {
      appearances: r.appearances || 0,
      goals: r.goals || 0,
      assists: r.assists || 0,
      clean_sheets: r.clean_sheets || 0,
      yellow_cards: r.yellow_cards || 0,
      red_cards: r.red_cards || 0,
      minutes_played: r.minutes_played || 0,
      fantasy_points: r.fantasy_points || 0,
      fantasy_value: r.fantasy_value || 0
    }
  })));
});
app.get("/api/teams/compare", (req, res) => {
  const { team1, team2 } = req.query;
  if (!team1 || !team2) return res.status(400).json({ error: "team1 and team2 required" });
  const t1 = db.prepare("SELECT t.*, l.name as leagueName FROM teams t JOIN leagues l ON l.id = t.league WHERE t.id = ?").get(team1);
  const t2 = db.prepare("SELECT t.*, l.name as leagueName FROM teams t JOIN leagues l ON l.id = t.league WHERE t.id = ?").get(team2);
  if (!t1 || !t2) return res.status(404).json({ error: "Team not found" });
  const squad = (tid) => db.prepare(
    "SELECT COUNT(*) as total, COALESCE(SUM(s.goals),0) as goals, COALESCE(SUM(s.assists),0) as assists, COALESCE(SUM(s.clean_sheets),0) as clean_sheets, COALESCE(AVG(s.appearances),0) as avgApps FROM players p LEFT JOIN player_season_stats s ON s.player_id = p.id AND s.season = '2024-25' WHERE p.team_id = ?"
  ).get(tid);
  const posCount = (tid) => {
    const rows = db.prepare("SELECT position, COUNT(*) as cnt FROM players WHERE team_id = ? GROUP BY position").all(tid);
    const m = {};
    for (const r of rows) m[r.position] = r.cnt;
    return m;
  };
  const h2h = db.prepare(
    "SELECT m.*, l.name as leagueName FROM matches m JOIN leagues l ON l.id = m.leagueId WHERE (LOWER(m.homeTeamName)=LOWER(?) AND LOWER(m.awayTeamName)=LOWER(?)) OR (LOWER(m.homeTeamName)=LOWER(?) AND LOWER(m.awayTeamName)=LOWER(?)) ORDER BY m.matchDate DESC LIMIT 10"
  ).all(t1.name, t2.name, t2.name, t1.name);
  const s1 = squad(team1), s2 = squad(team2);
  res.json({
    team1: {
      id: t1.id,
      name: t1.name,
      country: t1.country,
      league: t1.leagueName,
      logo_url: t1.logo_url,
      squad: { total: s1.total || 0, goals: s1.goals || 0, assists: s1.assists || 0, clean_sheets: s1.clean_sheets || 0, avgApps: Math.round(s1.avgApps || 0) },
      positions: posCount(team1)
    },
    team2: {
      id: t2.id,
      name: t2.name,
      country: t2.country,
      league: t2.leagueName,
      logo_url: t2.logo_url,
      squad: { total: s2.total || 0, goals: s2.goals || 0, assists: s2.assists || 0, clean_sheets: s2.clean_sheets || 0, avgApps: Math.round(s2.avgApps || 0) },
      positions: posCount(team2)
    },
    h2hMatches: h2h.map((m) => ({ id: m.id, leagueName: m.leagueName, homeTeamName: m.homeTeamName, awayTeamName: m.awayTeamName, matchDate: m.matchDate, homeWinOdds: m.homeWinOdds, drawOdds: m.drawOdds, awayWinOdds: m.awayWinOdds }))
  });
});
app.get("/api/players", (req, res) => {
  const { search, team, position, country } = req.query;
  let sql = `SELECT p.*, t.name as teamName, s.appearances, s.goals, s.assists, s.clean_sheets, s.yellow_cards, s.red_cards, s.minutes_played, s.fantasy_points, s.fantasy_value
    FROM players p JOIN teams t ON t.id = p.team_id LEFT JOIN player_season_stats s ON s.player_id = p.id AND s.season = '2024-25'`;
  const params = [];
  const conds = [];
  if (search) {
    conds.push("p.name LIKE ?");
    params.push(`%${search}%`);
  }
  if (team) {
    conds.push("p.team_id = ?");
    params.push(team);
  }
  if (position) {
    conds.push("p.position = ?");
    params.push(position);
  }
  if (country) {
    conds.push("p.country = ?");
    params.push(country);
  }
  if (conds.length) sql += " WHERE " + conds.join(" AND ");
  sql += " ORDER BY p.name ASC LIMIT 1000";
  const rows = db.prepare(sql).all(...params);
  const seen = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const key = `${r.name.toLowerCase()}|${(r.teamName || "").toLowerCase()}`;
    const existing = seen.get(key);
    if (!existing || (r.appearances || 0) > (existing.appearances || 0)) {
      seen.set(key, r);
    }
  }
  const deduped = Array.from(seen.values());
  res.json(deduped.map((r) => ({
    id: r.id,
    name: r.name,
    team_id: r.team_id,
    teamName: r.teamName,
    country: r.country,
    position: r.position,
    number: r.number,
    birth_date: r.birth_date,
    height: r.height,
    weight: r.weight,
    fifa_rating: r.fifa_rating,
    transfer_fee: r.transfer_fee,
    wages: r.wages,
    market_value: r.market_value,
    preferred_foot: r.preferred_foot,
    stats: {
      appearances: r.appearances || 0,
      goals: r.goals || 0,
      assists: r.assists || 0,
      clean_sheets: r.clean_sheets || 0,
      yellow_cards: r.yellow_cards || 0,
      red_cards: r.red_cards || 0,
      minutes_played: r.minutes_played || 0,
      fantasy_points: r.fantasy_points || 0,
      fantasy_value: r.fantasy_value || 0
    }
  })));
});
app.get("/api/players/:id", (req, res) => {
  const player = db.prepare(
    "SELECT p.*, t.name as teamName, t.league as teamLeague, l.name as leagueName FROM players p JOIN teams t ON t.id = p.team_id JOIN leagues l ON l.id = t.league WHERE p.id = ?"
  ).get(req.params.id);
  if (!player) return res.status(404).json({ error: "Player not found" });
  const statsRows = db.prepare("SELECT * FROM player_season_stats WHERE player_id = ? ORDER BY season DESC").all(req.params.id);
  res.json({
    id: player.id,
    name: player.name,
    team_id: player.team_id,
    teamName: player.teamName,
    teamLeague: player.teamLeague,
    leagueName: player.leagueName,
    country: player.country,
    position: player.position,
    number: player.number,
    birth_date: player.birth_date,
    height: player.height,
    weight: player.weight,
    fifa_rating: player.fifa_rating,
    transfer_fee: player.transfer_fee,
    wages: player.wages,
    market_value: player.market_value,
    preferred_foot: player.preferred_foot,
    stats: statsRows.map((s) => ({
      season: s.season,
      appearances: s.appearances,
      goals: s.goals,
      assists: s.assists,
      clean_sheets: s.clean_sheets,
      yellow_cards: s.yellow_cards,
      red_cards: s.red_cards,
      minutes_played: s.minutes_played || 0,
      fantasy_points: s.fantasy_points || 0,
      fantasy_value: s.fantasy_value || 0
    }))
  });
});
app.post("/api/players/ingest", (req, res) => {
  const { teams, players, season } = req.body || {};
  if (!Array.isArray(players) || players.length === 0) {
    return res.status(400).json({ error: "players array required" });
  }
  const s = season || "2024-25";
  const insertTeam = db.prepare("INSERT OR IGNORE INTO teams (id, name, country, league, logo_url) VALUES (?, ?, ?, ?, ?)");
  const insertPlayer = db.prepare("INSERT OR REPLACE INTO players (id, name, team_id, country, position, number, birth_date, height, weight, fifa_rating, transfer_fee, wages, market_value, preferred_foot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const insertStats = db.prepare("INSERT OR REPLACE INTO player_season_stats (id, player_id, season, appearances, goals, assists, clean_sheets, yellow_cards, red_cards, minutes_played, fantasy_points, fantasy_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  if (Array.isArray(teams)) {
    for (const t of teams) {
      insertTeam.run(t.id, t.name, t.country, t.league, t.logo_url || null);
    }
  }
  let inserted = 0;
  let errors = 0;
  for (const p of players) {
    try {
      insertPlayer.run(
        p.id,
        p.name,
        p.team_id,
        p.country,
        p.position,
        p.number ?? null,
        p.birth_date ?? null,
        p.height ?? null,
        p.weight ?? null,
        p.fifa_rating ?? null,
        p.transfer_fee ?? null,
        p.wages ?? null,
        p.market_value ?? null,
        p.preferred_foot ?? null
      );
      insertStats.run(
        `s_${p.id}`,
        p.id,
        s,
        p.appearances ?? 0,
        p.goals ?? 0,
        p.assists ?? 0,
        p.clean_sheets ?? 0,
        p.yellow_cards ?? 0,
        p.red_cards ?? 0,
        p.minutes_played ?? 0,
        p.fantasy_points ?? 0,
        p.fantasy_value ?? 0
      );
      inserted++;
    } catch {
      errors++;
    }
  }
  res.json({ ok: true, inserted, errors });
});
async function runDailyJobs() {
  ensureSampleMatches();
  const upcoming = db.prepare(
    `SELECT id, homeTeamName, awayTeamName, homeWinOdds, drawOdds, awayWinOdds FROM matches
     WHERE matchDate BETWEEN ? AND ?`
  ).all(Date.now(), Date.now() + 24 * 60 * 60 * 1e3);
  for (const m of upcoming) {
    await generatePredictionForMatch(m);
  }
  if (RESEND_API_KEY) {
    try {
      const Resend = (await import("resend")).Resend;
      const resend = new Resend(RESEND_API_KEY);
      const users = db.prepare(
        `SELECT u.email FROM users u
         JOIN user_preferences p ON p.userId = u.id
         WHERE p.emailNotifications = 1`
      ).all();
      if (users.length) {
        const subject = "Today's Betting Tips";
        await Promise.all(
          users.map(
            (u) => resend.emails.send({
              from: "Tips <onboarding@resend.dev>",
              to: u.email,
              subject,
              text: "Your daily tips are ready. Visit the app to see recommendations."
            })
          )
        );
      }
    } catch {
    }
  }
}
var CRON_TZ = process.env.CRON_TZ || "UTC";
cron.schedule(
  "0 9 * * *",
  () => {
    runDailyJobs().catch(() => {
    });
    sendDailyEmails().catch(() => {
    });
  },
  { timezone: CRON_TZ }
);
setTimeout(() => {
  runDailyJobs().catch(() => {
  });
}, 1500);
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var distPath = path.resolve(__dirname, "../dist");
app.use(express.static(distPath));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/auth")) return next();
  try {
    return res.sendFile(path.join(distPath, "index.html"));
  } catch {
    return next();
  }
});
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
async function sendDailyEmails() {
  if (!RESEND_API_KEY) return;
  try {
    const Resend = (await import("resend")).Resend;
    const resend = new Resend(RESEND_API_KEY);
    const start = /* @__PURE__ */ new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1e3);
    const rows = db.prepare(
      `SELECT m.homeTeamName, m.awayTeamName, m.matchDate, l.name as leagueName, p.prediction, p.confidence
         FROM matches m
         JOIN leagues l ON l.id = m.leagueId
         JOIN predictions p ON p.matchId = m.id
         WHERE m.matchDate BETWEEN ? AND ? AND p.confidence >= ?
         ORDER BY p.confidence DESC, m.matchDate ASC`
    ).all(start.getTime(), end.getTime(), 85);
    if (!rows.length) return;
    const lines = rows.map(
      (r) => `${r.leagueName}: ${r.homeTeamName} vs ${r.awayTeamName} \u2022 ${new Date(r.matchDate).toLocaleString()} \u2022 ${String(
        r.prediction
      ).toUpperCase()} (${r.confidence}%)`
    );
    const users = db.prepare(
      `SELECT u.email FROM users u
         JOIN user_preferences p ON p.userId = u.id
         WHERE p.emailNotifications = 1`
    ).all();
    await Promise.all(
      users.map(
        (u) => resend.emails.send({
          from: "Tips <onboarding@resend.dev>",
          to: u.email,
          subject: "Today\u2019s High-Confidence Picks",
          text: lines.join("\n")
        })
      )
    );
  } catch {
  }
}
