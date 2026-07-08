import { Router } from "express";
import { query, queryOne } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { RESOURCES } from "./resources.js";

const router = Router();

// Aggregate numbers + chart-friendly breakdowns for the dashboard.
// All aggregates ignore soft-deleted rows (deleted_at IS NULL).
router.get("/", requireAuth, async (_req, res, next) => {
  try {
    const counts = {};
    for (const resource of RESOURCES) {
      const row = await queryOne(`SELECT COUNT(*)::int AS count FROM ${resource.table} WHERE deleted_at IS NULL`);
      counts[resource.key] = row.count;
    }

    const sitesByCategory = await query(
      `SELECT COALESCE(category, 'Unknown') AS category, COUNT(*)::int AS count
         FROM site_detail WHERE deleted_at IS NULL GROUP BY category ORDER BY count DESC`
    );
    const sitesByCountry = await query(
      `SELECT country_code, COUNT(*)::int AS count
         FROM site_detail WHERE deleted_at IS NULL GROUP BY country_code`
    );
    const sitesByRegion = await query(
      `SELECT COALESCE(c.region, 'Unknown') AS region, COUNT(*)::int AS count
         FROM site_detail s
         LEFT JOIN member_country c ON c.country_code = s.country_code
        WHERE s.deleted_at IS NULL
        GROUP BY c.region ORDER BY count DESC`
    );
    const fundsByType = await query(
      `SELECT COALESCE(fund_type, 'Unknown') AS type, COUNT(*)::int AS count, COALESCE(SUM(total_amount), 0) AS total
         FROM fund WHERE deleted_at IS NULL GROUP BY fund_type ORDER BY total DESC`
    );
    const donationsOverTime = await query(
      `SELECT to_char(date, 'YYYY-MM') AS month, COALESCE(SUM(amount), 0) AS total, COUNT(*)::int AS count
         FROM donation WHERE deleted_at IS NULL AND date IS NOT NULL
        GROUP BY month ORDER BY month ASC`
    );
    const donations = await queryOne(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*)::int AS count FROM donation WHERE deleted_at IS NULL`
    );
    const fundTotals = await queryOne(
      `SELECT COALESCE(SUM(total_amount), 0) AS total, COALESCE(SUM(unused_amount), 0) AS unused
         FROM fund WHERE deleted_at IS NULL`
    );
    const dangerSites = await queryOne(`SELECT COUNT(*)::int AS count FROM provisional_danger_site WHERE deleted_at IS NULL`);

    res.json({
      counts,
      sitesByCategory,
      sitesByCountry,
      sitesByRegion,
      fundsByType: fundsByType.map((r) => ({ type: r.type, count: r.count, total: Number(r.total) })),
      donationsOverTime: donationsOverTime.map((r) => ({ month: r.month, total: Number(r.total), count: r.count })),
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
