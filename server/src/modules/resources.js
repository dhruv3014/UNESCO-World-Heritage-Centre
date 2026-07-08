// Describes every domain table once. This single registry powers the generic
// CRUD/search/filter API and the frontend's dynamic tables and filters.
//
// Field shape: { name, label, type, searchable?, filterable?, isId? }
//   type: "string" | "number" | "boolean" | "date"
//   searchable: included in free-text ?search=
//   filterable: can be used in per-field filters
//   isId: part of the primary key

// Small builders to keep the definitions short and readable.
const str = (name, label, extra = {}) => ({ name, label, type: "string", ...extra });
const num = (name, label, extra = {}) => ({ name, label, type: "number", ...extra });
const bool = (name, label, extra = {}) => ({ name, label, type: "boolean", ...extra });
const date = (name, label, extra = {}) => ({ name, label, type: "date", ...extra });

export const RESOURCES = [
  {
    key: "sites",
    table: "site_detail",
    label: "Heritage Sites",
    description: "Core information about each World Heritage site.",
    pk: ["s_id"],
    defaultSort: "s_id",
    // Enables full-text search; `headline` is the column used for highlighted snippets.
    fullText: { headline: "historical_detail" },
    fields: [
      num("s_id", "Site ID", { isId: true, filterable: true }),
      str("site_name", "Site Name", { searchable: true, filterable: true }),
      str("address", "Address", { searchable: true, filterable: true }),
      num("latitude", "Latitude"),
      num("longitude", "Longitude"),
      num("area", "Area (ha)", { filterable: true }),
      num("country_code", "Country Code", { filterable: true }),
      str("category", "Category", { searchable: true, filterable: true }),
      num("buffer_zone", "Buffer Zone (ha)"),
      str("historical_detail", "Historical Detail", { searchable: true }),
      str("ownership", "Ownership", { searchable: true, filterable: true }),
      num("institute_id", "Institute ID", { filterable: true }),
    ],
  },
  {
    key: "managers",
    table: "site_manager",
    label: "Site Managers",
    description: "People responsible for managing sites.",
    pk: ["m_id"],
    defaultSort: "m_id",
    fields: [
      num("m_id", "Manager ID", { isId: true, filterable: true }),
      num("s_id", "Site ID", { filterable: true }),
      str("name", "Name", { searchable: true, filterable: true }),
      str("gender", "Gender", { filterable: true }),
      num("age", "Age", { filterable: true }),
      num("salary", "Salary", { filterable: true }),
      num("working_hours", "Working Hours"),
      str("contact", "Contact", { searchable: true }),
      date("joining_date", "Joining Date", { filterable: true }),
      date("retirement_date", "Retirement Date"),
    ],
  },
  {
    key: "status-reports",
    table: "status_report",
    label: "Status Reports",
    description: "Periodic condition reports filed by managers.",
    pk: ["report_id"],
    defaultSort: "report_id",
    fields: [
      num("report_id", "Report ID", { isId: true, filterable: true }),
      num("m_id", "Manager ID", { filterable: true }),
      date("submission_date", "Submission Date", { filterable: true }),
      str("report_details", "Details", { searchable: true }),
      str("period_of_observation", "Period", { searchable: true, filterable: true }),
    ],
  },
  {
    key: "danger-sites",
    table: "provisional_danger_site",
    label: "Danger Sites",
    description: "Sites in danger with causes and prevention steps.",
    pk: ["s_id"],
    defaultSort: "s_id",
    fields: [
      num("s_id", "Site ID", { isId: true, filterable: true }),
      num("institute_id", "Institute ID", { filterable: true }),
      str("type_of_danger", "Type of Danger", { searchable: true, filterable: true }),
      str("steps_to_prevent", "Steps to Prevent", { searchable: true }),
      str("cause_of_danger", "Cause of Danger", { searchable: true }),
    ],
  },
  {
    key: "institutes",
    table: "local_institute_agency",
    label: "Local Institutes",
    description: "Local agencies responsible for sites.",
    pk: ["institute_id"],
    defaultSort: "institute_id",
    fields: [
      num("institute_id", "Institute ID", { isId: true, filterable: true }),
      str("institute_name", "Name", { searchable: true, filterable: true }),
      str("officer", "Officer", { searchable: true, filterable: true }),
      str("address", "Address", { searchable: true }),
      str("contact", "Contact", { searchable: true }),
    ],
  },
  {
    key: "funds",
    table: "fund",
    label: "Funds",
    description: "Fund pools for conservation and emergencies.",
    pk: ["f_id"],
    defaultSort: "f_id",
    fields: [
      num("f_id", "Fund ID", { isId: true, filterable: true }),
      num("total_amount", "Total Amount", { filterable: true }),
      num("unused_amount", "Unused Amount", { filterable: true }),
      str("used_fund_details", "Used Fund Details", { searchable: true }),
      date("allocation_date", "Allocation Date", { filterable: true }),
      str("fund_period", "Period", { searchable: true, filterable: true }),
      str("fund_type", "Fund Type", { searchable: true, filterable: true }),
    ],
  },
  {
    key: "other-funds",
    table: "other_fund",
    label: "Manager Fund Links",
    description: "Links funds to site managers.",
    pk: ["f_id"],
    defaultSort: "f_id",
    fields: [
      num("f_id", "Fund ID", { isId: true, filterable: true }),
      num("m_id", "Manager ID", { filterable: true }),
    ],
  },
  {
    key: "danger-site-funds",
    table: "danger_site_fund",
    label: "Danger Site Fund Links",
    description: "Links funds to danger sites.",
    pk: ["f_id"],
    defaultSort: "f_id",
    fields: [
      num("f_id", "Fund ID", { isId: true, filterable: true }),
      num("s_id", "Site ID", { filterable: true }),
    ],
  },
  {
    key: "countries",
    table: "member_country",
    label: "Member Countries",
    description: "UNESCO member states.",
    pk: ["country_code"],
    defaultSort: "country_code",
    fields: [
      num("country_code", "Country Code", { isId: true, filterable: true }),
      str("country_name", "Country Name", { searchable: true, filterable: true }),
      str("region", "Region", { searchable: true, filterable: true }),
      str("representative", "Representative", { searchable: true }),
      bool("veto_power", "Veto Power", { filterable: true }),
      num("donor_id", "Donor ID", { filterable: true }),
    ],
  },
  {
    key: "donations",
    table: "donation",
    label: "Donations",
    description: "Individual donation transactions.",
    pk: ["transaction_id"],
    defaultSort: "transaction_id",
    fields: [
      num("transaction_id", "Transaction ID", { isId: true, filterable: true }),
      num("donor_id", "Donor ID", { filterable: true }),
      num("amount", "Amount", { filterable: true }),
      date("date", "Date", { filterable: true }),
      str("time", "Time"),
    ],
  },
  {
    key: "donors",
    table: "donor_detail",
    label: "Donors",
    description: "Donor profiles.",
    pk: ["donor_id"],
    defaultSort: "donor_id",
    fields: [
      num("donor_id", "Donor ID", { isId: true, filterable: true }),
      str("donor_name", "Donor Name", { searchable: true, filterable: true }),
      str("donor_type", "Donor Type", { searchable: true, filterable: true }),
      str("contact", "Contact", { searchable: true }),
    ],
  },
  {
    key: "committee",
    table: "world_heritage_committee",
    label: "Heritage Committee",
    description: "World Heritage Committee members.",
    pk: ["member_id"],
    defaultSort: "member_id",
    fields: [
      num("member_id", "Member ID", { isId: true, filterable: true }),
      str("member_name", "Member Name", { searchable: true, filterable: true }),
      num("country_code", "Country Code", { filterable: true }),
      str("tenure", "Tenure", { searchable: true }),
      num("salary", "Salary", { filterable: true }),
      str("contact", "Contact", { searchable: true }),
    ],
  },
  {
    key: "awards",
    table: "award",
    label: "Awards",
    description: "Awards granted to member countries.",
    pk: ["year", "country_code", "category"],
    defaultSort: "year",
    fields: [
      num("year", "Year", { isId: true, filterable: true }),
      num("country_code", "Country Code", { isId: true, filterable: true }),
      str("category", "Category", { isId: true, searchable: true, filterable: true }),
      str("award_detail", "Award Detail", { searchable: true }),
    ],
  },
];

const RESOURCE_BY_KEY = Object.fromEntries(RESOURCES.map((r) => [r.key, r]));
const RESOURCE_BY_TABLE = Object.fromEntries(RESOURCES.map((r) => [r.table, r]));

export const getResourceByKey = (key) => RESOURCE_BY_KEY[key];
export const getResourceByTable = (table) => RESOURCE_BY_TABLE[table];
