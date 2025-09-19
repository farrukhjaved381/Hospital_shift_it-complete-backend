-- Phase 5 materialized views (initial cut). Adjust as needed.

-- Placements monthly: per school, counts by status using request + rotation timing
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_placements_monthly AS
SELECT
  rr."schoolId"        AS school_id,
  date_trunc('month', COALESCE(rot."startDate", rr."startDate"))::date AS month,
  COUNT(*) FILTER (WHERE rr.status = 'APPROVED') AS approved_count,
  COUNT(*) FILTER (WHERE rr.status = 'PENDING')  AS pending_count,
  COUNT(*) FILTER (WHERE rr.status = 'DENIED')   AS denied_count
FROM "RotationRequest" rr
LEFT JOIN "Rotation" rot ON rot."requestId" = rr.id
GROUP BY rr."schoolId", date_trunc('month', COALESCE(rot."startDate", rr."startDate"))::date;

CREATE INDEX IF NOT EXISTS idx_mv_placements_monthly_school_month ON mv_placements_monthly(school_id, month);

-- Compliance monthly: documents by user affiliation (org)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_compliance_monthly AS
SELECT
  u."affiliationId"    AS org_id,
  date_trunc('month', d."createdAt")::date AS month,
  COUNT(*) FILTER (WHERE d.status = 'APPROVED') AS approved_docs,
  COUNT(*) FILTER (WHERE d.status = 'PENDING')  AS pending_docs,
  COUNT(*) FILTER (WHERE d.status = 'DENIED')   AS denied_docs,
  COUNT(*) FILTER (WHERE d.status = 'EXPIRED')  AS expired_docs
FROM "Document" d
JOIN "User" u ON u.id = d."userId"
GROUP BY u."affiliationId", date_trunc('month', d."createdAt")::date;

CREATE INDEX IF NOT EXISTS idx_mv_compliance_monthly_org_month ON mv_compliance_monthly(org_id, month);

-- Billing monthly: totals by school
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_billing_monthly AS
SELECT
  i."schoolId"                   AS school_id,
  date_trunc('month', i."createdAt")::date AS month,
  SUM(i.total) AS total_invoiced,
  SUM(CASE WHEN i.status = 'PAID' THEN i.total ELSE 0 END) AS total_paid,
  SUM(CASE WHEN i.status IN ('SENT', 'PENDING_PAYMENT') THEN i.total ELSE 0 END) AS total_outstanding
FROM "Invoice" i
GROUP BY i."schoolId", date_trunc('month', i."createdAt")::date;

CREATE INDEX IF NOT EXISTS idx_mv_billing_monthly_school_month ON mv_billing_monthly(school_id, month);

-- Rotation utilization: capacity vs assignments, by hospital
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_rotation_utilization AS
SELECT
  r."hospitalId" AS hospital_id,
  r.id           AS rotation_id,
  r.capacity,
  COALESCE(ass.cnt, 0) AS assigned,
  CASE WHEN r.capacity > 0 THEN (COALESCE(ass.cnt,0)::decimal / r.capacity) ELSE 0 END AS occupancy
FROM "Rotation" r
LEFT JOIN (
  SELECT a."rotationId" AS rotation_id, COUNT(*) AS cnt
  FROM "Assignment" a
  GROUP BY a."rotationId"
) ass ON ass.rotation_id = r.id;

CREATE INDEX IF NOT EXISTS idx_mv_rotation_utilization_hospital ON mv_rotation_utilization(hospital_id);

