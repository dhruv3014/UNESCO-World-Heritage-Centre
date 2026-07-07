import { Router } from "express";
import { query, queryOne } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { RESOURCES } from "./resources.js";

const router = Router();

// Aggregate numbers + chart-friendly breakdowns for the dashboard.
router.get("/", requireAuth, async (_req, res, next) => {
  try {
    // Row counts for every table.
    const counts = {};
    for (const resource of RESOURCES) {
      const row = await queryOne(`SELECT COUNT(*)::int AS count FROM ${resource.table}`);
      counts[resource.key] = row.count;
    }

    const sitesByCategory = await query(
      `SELECT COALESCE(category, 'Unknown') AS category, COUNT(*)::int AS count
         FROM site_detail GROUP BY category ORDER BY count DESC`
    );
    const sitesByCountry = await query(
      `SELECT country_code, COUNT(*)::int AS count
         FROM site_detail GROUP BY country_code`
    );
    const fundsByType = await query(
      `SELECT COALESCE(fund_type, 'Unknown') AS type,
              COUNT(*)::int AS count,
              COALESCE(SUM(total_amount), 0) AS total
         FROM fund GROUP BY fund_type ORDER BY total DESC`
    );
    const donations = await queryOne(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*)::int AS count FROM donation`
    );
    const fundTotals = await queryOne(
      `SELECT COALESCE(SUM(total_amount), 0) AS total, COALESCE(SUM(unused_amount), 0) AS unused FROM fund`
    );
    const dangerSites = await queryOne(`SELECT COUNT(*)::int AS count FROM provisional_danger_site`);

    res.json({
      counts,
      sitesByCategory,
      sitesByCountry,
      fundsByType: fundsByType.map((r) => ({ type: r.type, count: r.count, total: Number(r.total) })),
      donations: { total: Number(donations.total), count: donations.count },
      dangerSites: dangerSites.count,
      funds: {
        total: Number(fundTotals.total),
        unused: Number(fundTotals.unused),
        used: Number(fundTotals.total) - Number(fundTotals.unused),
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
