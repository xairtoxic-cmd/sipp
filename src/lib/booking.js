// Link-first booking helpers (no native engine yet).

const PROVIDER_LABEL = {
  opentable: "OpenTable",
  sevenrooms: "SevenRooms",
  resy: "Resy",
  tock: "Tock",
  restaurant_website: "the restaurant's website",
  whatsapp: "WhatsApp",
  phone: "phone",
  native: "Sipp",
};

export function providerLabel(provider) {
  return PROVIDER_LABEL[provider] || "the restaurant";
}

// Returns the best booking method for a place, or null.
// { kind, url, provider, eventType, trackType, cta }
export function getBestBookingMethod(place) {
  if (!place || !place.bookingCtaEnabled || place.walkInOnly) return null;
  const provider = place.bookingProvider;

  // 1) native (future) — not enabled yet
  // 2) explicit booking URL (OpenTable / SevenRooms / Resy / Tock / website)
  if (place.bookingUrl) {
    const url = place.bookingUrl.startsWith("http") ? place.bookingUrl : `https://${place.bookingUrl}`;
    return {
      kind: "url",
      url,
      provider: provider && provider !== "none" ? provider : "restaurant_website",
      eventType: "open_external_booking",
      trackType: "open_external_booking",
      cta: `Continue to ${providerLabel(provider && provider !== "none" ? provider : "restaurant_website")}`,
    };
  }
  // 3) WhatsApp
  if (place.bookingWhatsapp) {
    const digits = place.bookingWhatsapp.replace(/[^0-9]/g, "");
    return { kind: "whatsapp", url: `https://wa.me/${digits}`, provider: "whatsapp", eventType: "whatsapp_booking", trackType: "whatsapp_booking", cta: "Book on WhatsApp" };
  }
  // 4) phone
  if (place.bookingPhone) {
    return { kind: "phone", url: `tel:${place.bookingPhone.replace(/\s/g, "")}`, provider: "phone", eventType: "call_restaurant", trackType: "call_restaurant", cta: "Call to reserve" };
  }
  return null;
}

// Short status line for the profile.
export function reservationStatus(place) {
  if (!place) return null;
  if (place.walkInOnly) return "Walk-in only";
  const m = getBestBookingMethod(place);
  if (!m) return place.acceptsReservations ? "Call to reserve" : null;
  if (m.provider === "phone") return "Call to reserve";
  if (m.provider === "whatsapp") return "Booking via WhatsApp";
  return `Booking via ${providerLabel(m.provider)}`;
}
