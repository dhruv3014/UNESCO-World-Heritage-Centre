// Loads sample data and demo users. Usage: npm run seed
// Safe to re-run — every insert ignores rows that already exist.
import bcrypt from "bcryptjs";
import { pool, query } from "../src/config/db.js";
import { env } from "../src/config/env.js";

// Insert one row, ignoring it if the primary key already exists.
async function insert(table, row, conflictColumns) {
  const columns = Object.keys(row);
  const placeholders = columns.map((_, i) => `$${i + 1}`);
  await query(
    `INSERT INTO ${table} (${columns.join(", ")})
     VALUES (${placeholders.join(", ")})
     ON CONFLICT (${conflictColumns}) DO NOTHING`,
    Object.values(row)
  );
}

async function main() {
  console.log("Seeding database...");

  // --- Users ---
  await insert(
    "app_user",
    { email: env.adminEmail, name: "WHC Administrator", password_hash: await bcrypt.hash(env.adminPassword, 10), role: "ADMIN" },
    "email"
  );
  await insert(
    "app_user",
    { email: "user@whc.org", name: "Public Viewer", password_hash: await bcrypt.hash("User@12345", 10), role: "USER" },
    "email"
  );

  // --- Donors ---
  const donors = [
    { donor_id: 1, donor_name: "Global Heritage Trust", donor_type: "Foundation", contact: "+1-202-555-0100" },
    { donor_id: 2, donor_name: "Nippon Cultural Fund", donor_type: "Government", contact: "+81-3-5555-0111" },
    { donor_id: 3, donor_name: "European Preservation Org", donor_type: "NGO", contact: "+32-2-555-0122" },
    { donor_id: 4, donor_name: "Anonymous Benefactor", donor_type: "Individual", contact: "n/a" },
  ];
  for (const d of donors) await insert("donor_detail", d, "donor_id");

  // --- Member countries ---
  const countries = [
    { country_code: 91, country_name: "India", region: "Asia-Pacific", representative: "A. Sharma", veto_power: false, donor_id: 1 },
    { country_code: 81, country_name: "Japan", region: "Asia-Pacific", representative: "K. Tanaka", veto_power: false, donor_id: 2 },
    { country_code: 33, country_name: "France", region: "Europe", representative: "M. Dubois", veto_power: true, donor_id: 3 },
    { country_code: 20, country_name: "Egypt", region: "Arab States", representative: "H. Nasser", veto_power: false, donor_id: 4 },
    { country_code: 51, country_name: "Peru", region: "Latin America", representative: "L. Quispe", veto_power: false, donor_id: null },
    { country_code: 39, country_name: "Italy", region: "Europe", representative: "G. Rossi", veto_power: false, donor_id: 3 },
    { country_code: 86, country_name: "China", region: "Asia-Pacific", representative: "W. Li", veto_power: true, donor_id: 2 },
    { country_code: 1, country_name: "United States", region: "North America", representative: "J. Carter", veto_power: false, donor_id: 1 },
  ];
  for (const c of countries) await insert("member_country", c, "country_code");

  // --- Institutes ---
  const institutes = [
    { institute_id: 1, institute_name: "Archaeological Survey of India", officer: "R. Menon", address: "New Delhi, India", contact: "+91-11-5550-0001" },
    { institute_id: 2, institute_name: "Agency for Cultural Affairs", officer: "S. Ito", address: "Tokyo, Japan", contact: "+81-3-5550-0002" },
    { institute_id: 3, institute_name: "Centre des Monuments Nationaux", officer: "C. Laurent", address: "Paris, France", contact: "+33-1-5550-0003" },
    { institute_id: 4, institute_name: "Supreme Council of Antiquities", officer: "M. Farouk", address: "Cairo, Egypt", contact: "+20-2-5550-0004" },
  ];
  for (const i of institutes) await insert("local_institute_agency", i, "institute_id");

  // --- Sites ---
  const sites = [
    { s_id: 1, site_name: "Taj Mahal", address: "Agra, Uttar Pradesh", latitude: 27.1751, longitude: 78.0421, area: 17.0, country_code: 91, category: "Cultural", buffer_zone: 10.4, historical_detail: "Ivory-white marble mausoleum commissioned in 1632.", ownership: "Government of India", institute_id: 1 },
    { s_id: 2, site_name: "Historic Monuments of Kyoto", address: "Kyoto", latitude: 35.0116, longitude: 135.7681, area: 1056.0, country_code: 81, category: "Cultural", buffer_zone: 3579.0, historical_detail: "17 locations built between 8th-17th centuries.", ownership: "City of Kyoto", institute_id: 2 },
    { s_id: 3, site_name: "Palace of Versailles", address: "Versailles", latitude: 48.8049, longitude: 2.1204, area: 1070.0, country_code: 33, category: "Cultural", buffer_zone: 9467.0, historical_detail: "Royal residence of the French monarchy from 1682.", ownership: "French State", institute_id: 3 },
    { s_id: 4, site_name: "Memphis and its Necropolis", address: "Giza", latitude: 29.9792, longitude: 31.1342, area: 16359.0, country_code: 20, category: "Cultural", buffer_zone: 0.0, historical_detail: "Includes the Pyramid fields from Giza to Dahshur.", ownership: "Government of Egypt", institute_id: 4 },
    { s_id: 5, site_name: "Machu Picchu", address: "Cusco Region", latitude: -13.1631, longitude: -72.545, area: 32592.0, country_code: 51, category: "Mixed", buffer_zone: 0.0, historical_detail: "15th-century Inca citadel in the Andes.", ownership: "Government of Peru", institute_id: null },
    { s_id: 6, site_name: "Historic Centre of Rome", address: "Rome", latitude: 41.8902, longitude: 12.4922, area: 1431.0, country_code: 39, category: "Cultural", buffer_zone: 340.0, historical_detail: "Includes the Colosseum and Roman Forum.", ownership: "Italian State", institute_id: null },
    { s_id: 7, site_name: "Great Wall", address: "Northern China", latitude: 40.4319, longitude: 116.5704, area: 210000.0, country_code: 86, category: "Cultural", buffer_zone: 0.0, historical_detail: "Series of fortifications built across centuries.", ownership: "Government of China", institute_id: null },
    { s_id: 8, site_name: "Yellowstone National Park", address: "Wyoming", latitude: 44.428, longitude: -110.5885, area: 898300.0, country_code: 1, category: "Natural", buffer_zone: 0.0, historical_detail: "First national park in the world, established 1872.", ownership: "US National Park Service", institute_id: null },
  ];
  for (const s of sites) await insert("site_detail", s, "s_id");

  // --- Managers ---
  const managers = [
    { m_id: 1, s_id: 1, name: "Priya Nair", gender: "Female", age: 42, salary: 68000, working_hours: 40, contact: "+91-98-5550-1001", joining_date: "2015-06-01", retirement_date: "2040-06-01" },
    { m_id: 2, s_id: 2, name: "Haruto Sato", gender: "Male", age: 51, salary: 72000, working_hours: 38, contact: "+81-90-5550-1002", joining_date: "2010-04-15", retirement_date: "2034-04-15" },
    { m_id: 3, s_id: 3, name: "Camille Roux", gender: "Female", age: 39, salary: 75000, working_hours: 40, contact: "+33-6-5550-1003", joining_date: "2018-09-10", retirement_date: "2048-09-10" },
    { m_id: 4, s_id: 4, name: "Omar Hassan", gender: "Male", age: 47, salary: 61000, working_hours: 42, contact: "+20-10-5550-1004", joining_date: "2013-01-20", retirement_date: "2038-01-20" },
    { m_id: 5, s_id: 5, name: "Rosa Mamani", gender: "Female", age: 44, salary: 58000, working_hours: 40, contact: "+51-9-5550-1005", joining_date: "2016-11-05", retirement_date: "2041-11-05" },
  ];
  for (const m of managers) await insert("site_manager", m, "m_id");

  // --- Status reports ---
  const reports = [
    { report_id: 1, m_id: 1, submission_date: "2024-01-15", report_details: "Marble discoloration monitored; conservation ongoing.", period_of_observation: "Q4 2023" },
    { report_id: 2, m_id: 2, submission_date: "2024-02-10", report_details: "Temple structures stable; visitor load managed.", period_of_observation: "Q4 2023" },
    { report_id: 3, m_id: 4, submission_date: "2024-03-01", report_details: "Erosion near necropolis; mitigation planned.", period_of_observation: "Q1 2024" },
  ];
  for (const r of reports) await insert("status_report", r, "report_id");

  // --- Danger sites ---
  await insert(
    "provisional_danger_site",
    { s_id: 4, institute_id: 4, type_of_danger: "Environmental erosion", steps_to_prevent: "Groundwater control and structural reinforcement.", cause_of_danger: "Rising water table and urban encroachment." },
    "s_id"
  );

  // --- Funds ---
  const funds = [
    { f_id: 1, total_amount: 500000, unused_amount: 120000, used_fund_details: "Marble cleaning and staff training.", allocation_date: "2023-05-01", fund_period: "2023-2025", fund_type: "Conservation" },
    { f_id: 2, total_amount: 300000, unused_amount: 300000, used_fund_details: "Reserved for emergency response.", allocation_date: "2024-01-01", fund_period: "2024", fund_type: "Emergency" },
    { f_id: 3, total_amount: 250000, unused_amount: 80000, used_fund_details: "Erosion mitigation works.", allocation_date: "2024-02-01", fund_period: "2024-2026", fund_type: "Restoration" },
  ];
  for (const f of funds) await insert("fund", f, "f_id");
  await insert("other_fund", { f_id: 1, m_id: 1 }, "f_id");
  await insert("danger_site_fund", { f_id: 3, s_id: 4 }, "f_id");

  // --- Donations ---
  // Spread across many months so the "donations over time" chart is meaningful.
  const donations = [
    { transaction_id: 1, donor_id: 1, amount: 100000, date: "2023-01-12", time: "10:30" },
    { transaction_id: 2, donor_id: 2, amount: 150000, date: "2023-02-15", time: "14:05" },
    { transaction_id: 3, donor_id: 3, amount: 80000, date: "2023-03-20", time: "09:45" },
    { transaction_id: 4, donor_id: 4, amount: 50000, date: "2023-04-28", time: "16:20" },
    { transaction_id: 5, donor_id: 1, amount: 120000, date: "2023-06-05", time: "11:15" },
    { transaction_id: 6, donor_id: 2, amount: 90000, date: "2023-07-19", time: "13:40" },
    { transaction_id: 7, donor_id: 3, amount: 60000, date: "2023-09-02", time: "10:00" },
    { transaction_id: 8, donor_id: 4, amount: 70000, date: "2023-10-22", time: "15:30" },
    { transaction_id: 9, donor_id: 1, amount: 200000, date: "2023-12-11", time: "09:10" },
    { transaction_id: 10, donor_id: 2, amount: 110000, date: "2024-01-15", time: "12:25" },
    { transaction_id: 11, donor_id: 3, amount: 95000, date: "2024-02-08", time: "14:50" },
    { transaction_id: 12, donor_id: 4, amount: 130000, date: "2024-03-27", time: "16:05" },
    { transaction_id: 13, donor_id: 1, amount: 175000, date: "2024-05-14", time: "10:45" },
    { transaction_id: 14, donor_id: 2, amount: 85000, date: "2024-06-30", time: "13:20" },
  ];
  for (const d of donations) await insert("donation", d, "transaction_id");

  // --- Committee ---
  const committee = [
    { member_id: 1, member_name: "A. Sharma", country_code: 91, tenure: "2021-2025", salary: 90000, contact: "+91-11-5550-2001" },
    { member_id: 2, member_name: "M. Dubois", country_code: 33, tenure: "2022-2026", salary: 95000, contact: "+33-1-5550-2002" },
    { member_id: 3, member_name: "K. Tanaka", country_code: 81, tenure: "2020-2024", salary: 92000, contact: "+81-3-5550-2003" },
  ];
  for (const c of committee) await insert("world_heritage_committee", c, "member_id");

  // --- Awards ---
  const awards = [
    { category: "Conservation Excellence", year: 2023, country_code: 91, award_detail: "Recognized for Taj Mahal restoration." },
    { category: "Heritage Education", year: 2023, country_code: 33, award_detail: "Public outreach at Versailles." },
    { category: "Community Engagement", year: 2024, country_code: 51, award_detail: "Indigenous stewardship at Machu Picchu." },
  ];
  for (const a of awards) await insert("award", a, "year, country_code, category");

  // --- Initial schema-change log entry ---
  const existing = await query("SELECT id FROM schema_change_log LIMIT 1");
  if (existing.length === 0) {
    await query("INSERT INTO schema_change_log (migration, summary) VALUES ($1, $2)", [
      "init",
      "Initial schema: 13 domain tables + auth & versioning tables.",
    ]);
  }

  console.log("Seed complete.");
  console.log(`Admin login: ${env.adminEmail} / ${env.adminPassword}`);
  console.log("User login:  user@whc.org / User@12345");
  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
