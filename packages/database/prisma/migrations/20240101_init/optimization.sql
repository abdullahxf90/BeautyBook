-- Database Optimization Migration
-- Adds strategic indexes for query performance at scale

-- BOOKING INDEXES
CREATE INDEX IF NOT EXISTS idx_booking_user_salon ON "Booking" ("userId", "salonId");
CREATE INDEX IF NOT EXISTS idx_booking_salon_status ON "Booking" ("salonId", "status");
CREATE INDEX IF NOT EXISTS idx_booking_start_end ON "Booking" ("startAt", "endAt");
CREATE INDEX IF NOT EXISTS idx_booking_user_date ON "Booking" ("userId", "startAt");

-- PAYMENT INDEXES
CREATE INDEX IF NOT EXISTS idx_payment_status ON "Payment" ("status");
CREATE INDEX IF NOT EXISTS idx_payment_booking ON "Payment" ("bookingId");
CREATE INDEX IF NOT EXISTS idx_payment_created ON "Payment" ("createdAt");

-- USER INDEXES
CREATE INDEX IF NOT EXISTS idx_user_role_status ON "User" ("role", "status");
CREATE INDEX IF NOT EXISTS idx_user_email_status ON "User" ("email", "status");
CREATE INDEX IF NOT EXISTS idx_user_created ON "User" ("createdAt");

-- SALON INDEXES
CREATE INDEX IF NOT EXISTS idx_salon_verified_listed ON "Salon" ("verified", "listed");
CREATE INDEX IF NOT EXISTS idx_salon_area_city ON "Salon" ("areaId");
CREATE INDEX IF NOT EXISTS idx_salon_rating ON "Salon" ("rating" DESC NULLS LAST);

-- SERVICE INDEXES
CREATE INDEX IF NOT EXISTS idx_service_category ON "Service" ("categoryId");
CREATE INDEX IF NOT EXISTS idx_service_salon_category ON "Service" ("salonId", "categoryId");
CREATE INDEX IF NOT EXISTS idx_service_price ON "Service" ("price");

-- REVIEW INDEXES
CREATE INDEX IF NOT EXISTS idx_review_salon_rating ON "Review" ("salonId", "rating");
CREATE INDEX IF NOT EXISTS idx_review_user ON "Review" ("userId");
CREATE INDEX IF NOT EXISTS idx_review_created ON "Review" ("createdAt" DESC);

-- NOTIFICATION INDEXES
CREATE INDEX IF NOT EXISTS idx_notification_user_read ON "Notification" ("userId", "read");

-- FAVORITE INDEXES
CREATE INDEX IF NOT EXISTS idx_favorite_user ON "Favorite" ("userId");

-- AUDIT LOG INDEXES
CREATE INDEX IF NOT EXISTS idx_audit_entity ON "AuditLog" ("entity", "entityId");
CREATE INDEX IF NOT EXISTS idx_audit_action ON "AuditLog" ("action", "createdAt" DESC);

-- SUPPORT TICKET INDEXES
CREATE INDEX IF NOT EXISTS idx_ticket_status_priority ON "SupportTicket" ("status", "priority");

-- INVENTORY INDEXES
CREATE INDEX IF NOT EXISTS idx_inventory_salon ON "InventoryItem" ("salonId");
CREATE INDEX IF NOT EXISTS idx_inventory_low ON "InventoryItem" ("salonId", "quantity") WHERE "quantity" <= "reorderLevel";

-- STAFF INDEXES
CREATE INDEX IF NOT EXISTS idx_staff_salon_role ON "Staff" ("salonId", "role");

-- ANALYTICS INDEXES
CREATE INDEX IF NOT EXISTS idx_search_analytics_query_date ON "SearchAnalytics" ("query", "createdAt");
CREATE INDEX IF NOT EXISTS idx_trending_period ON "TrendingSearch" ("period", "count" DESC);

-- COMPOSITE INDEXES FOR COMMON QUERIES
CREATE INDEX IF NOT EXISTS idx_booking_full ON "Booking" ("salonId", "startAt", "status") INCLUDE ("userId", "total");
CREATE INDEX IF NOT EXISTS idx_payment_full ON "Payment" ("bookingId", "status", "amount");
CREATE INDEX IF NOT EXISTS idx_review_full ON "Review" ("salonId", "rating", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_user_full ON "User" ("role", "status", "createdAt" DESC);

-- VACUUM ANALYZE
ANALYZE;
