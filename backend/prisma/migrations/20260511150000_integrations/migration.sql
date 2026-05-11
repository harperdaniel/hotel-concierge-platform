-- Integrations: one row per configured booking pipe (manual queue,
-- webhook, email, OpenTable, Google Calendar). Offerings (venues,
-- services) and the hotel-level room-service flow each reference at most
-- one integration. Bookability is computed from this FK.

CREATE TABLE "integrations" (
  "id"            TEXT PRIMARY KEY,
  "hotelId"       TEXT NOT NULL REFERENCES "hotels"("id") ON DELETE CASCADE,
  "name"          TEXT NOT NULL,
  "kind"          TEXT NOT NULL,
  "endpoint"      TEXT,
  "authBlob"      TEXT,
  "status"        TEXT NOT NULL DEFAULT 'untested',
  "lastTestedAt"  TIMESTAMP(3),
  "lastError"     TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL
);
CREATE INDEX "integrations_hotelId_idx" ON "integrations"("hotelId");

-- Hotels: drop the v1 bookability column on room service and add the
-- new FK to Integration. roomServiceBookingNotes stays (per-hotel notes
-- shown to the concierge, not to guests).
ALTER TABLE "hotels"
  DROP COLUMN "roomServiceBookable",
  ADD COLUMN  "roomServiceIntegrationId" TEXT,
  ADD CONSTRAINT "hotels_roomServiceIntegrationId_fkey"
    FOREIGN KEY ("roomServiceIntegrationId")
    REFERENCES "integrations"("id")
    ON DELETE SET NULL;

-- Venues: drop the v1 bookable/bookingMethod columns, add integrationId FK.
-- bookingInstructions stays (per-venue notes for the concierge).
ALTER TABLE "venues"
  DROP COLUMN "bookable",
  DROP COLUMN "bookingMethod",
  ADD COLUMN  "integrationId" TEXT,
  ADD CONSTRAINT "venues_integrationId_fkey"
    FOREIGN KEY ("integrationId")
    REFERENCES "integrations"("id")
    ON DELETE SET NULL;

-- Services: same as venues.
ALTER TABLE "services"
  DROP COLUMN "bookable",
  DROP COLUMN "bookingMethod",
  ADD COLUMN  "integrationId" TEXT,
  ADD CONSTRAINT "services_integrationId_fkey"
    FOREIGN KEY ("integrationId")
    REFERENCES "integrations"("id")
    ON DELETE SET NULL;
