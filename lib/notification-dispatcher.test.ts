import { describe, expect, it } from "vitest";
import { hydratePendingRows } from "./notification-dispatcher";

describe("hydratePendingRows", () => {
  it("attaches profile and preferences by user_id", () => {
    const userId = "user-1";
    const base = [
      {
        id: 48,
        user_id: userId,
        classification: "Class II",
        created_at: new Date().toISOString(),
        email_sent_at: null,
        medication_items: {
          id: 10,
          product_name: "duloxetine",
          manufacturer: "Test Mfr",
          status: "active",
          expected_stop_date: null,
        },
        recalls: {
          recall_number: "D-0515-2026",
          reason_for_recall: "Test",
          recall_initiation_date: "2026-04-28",
        },
      },
    ];
    const profiles = new Map([
      [userId, { email: "user@example.com", full_name: "Test User" }],
    ]);
    const preferences = new Map([
      [
        userId,
        {
          email_enabled: true,
          email_instant_enabled: true,
          alert_on_class_i: true,
          alert_on_class_ii: true,
          alert_on_class_iii: false,
          alert_after_stop_date: false,
        },
      ],
    ]);

    const rows = hydratePendingRows(base, profiles, preferences);
    expect(rows).toHaveLength(1);
    expect(rows[0].profiles?.email).toBe("user@example.com");
    expect(rows[0].notification_preferences?.email_instant_enabled).toBe(true);
  });
});
