import { describe, expect, it } from "vitest";
import {
  composeDigest,
  countDistinctMedications,
  filterDigestNotifications,
  type DigestMatch,
} from "./daily-digest";

function row(partial: {
  id: number;
  status: string;
  product_name: string;
  med_status: string;
}): DigestMatch {
  return {
    id: partial.id,
    classification: "Class II",
    created_at: new Date().toISOString(),
    medication_items: {
      id: partial.id,
      product_name: partial.product_name,
      manufacturer: "Test Mfr",
      status: partial.med_status,
    },
    recalls: { recall_number: `D-${partial.id}`, reason_for_recall: "Test" },
  };
}

describe("filterDigestNotifications", () => {
  it("keeps unread alerts for active medications only", () => {
    const rows = [
      row({ id: 1, status: "unread", product_name: "magnesium sulfate", med_status: "active" }),
      row({ id: 2, status: "unread", product_name: "duloxetine", med_status: "deleted" }),
    ];
    const filtered = filterDigestNotifications(rows);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].medication_items?.product_name).toBe("magnesium sulfate");
  });
});

describe("composeDigest", () => {
  it("uses alert count wording for multiple recalls on one drug", () => {
    const matches = [
      row({ id: 6, status: "unread", product_name: "duloxetine", med_status: "active" }),
      row({ id: 7, status: "unread", product_name: "duloxetine", med_status: "active" }),
      row({ id: 5, status: "unread", product_name: "magnesium sulfate", med_status: "active" }),
    ];
    const { subject } = composeDigest({
      userName: "test",
      matches: filterDigestNotifications(matches),
      medCount: 2,
      appUrl: "http://localhost:3000",
    });
    expect(subject).toBe("[FDA] 3 unread recall alerts in your cabinet");
    expect(countDistinctMedications(matches)).toBe(2);
  });

  it("all-clear when no eligible matches", () => {
    const { subject } = composeDigest({
      userName: "test",
      matches: [],
      medCount: 2,
      appUrl: "http://localhost:3000",
    });
    expect(subject).toBe("[FDA] Daily check — no recalls found");
  });

  it("alert digest includes active-med unread regardless of prior email_sent_at", () => {
    const matches = filterDigestNotifications([
      row({ id: 5, status: "unread", product_name: "magnesium sulfate", med_status: "active" }),
    ]);
    const { subject } = composeDigest({
      userName: "test",
      matches,
      medCount: 1,
      appUrl: "http://localhost:3000",
    });
    expect(subject).toBe("[FDA] 1 unread recall alert in your cabinet");
  });
});
