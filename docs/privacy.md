# Employee & Customer Privacy Architecture

## 1. Ethical Telecalling Monitoring Principles

TeleTrack is designed to support legitimate business telecalling operations while safeguarding the privacy of both employees and customers.

---

## 2. Customer Privacy: Phone Number Masking

Organizations can toggle `mask_phone_numbers` in Organization Settings:
- When enabled, telecaller and manager views display obfuscated numbers:
  - Raw: `+919822011223`
  - Display: `+91****1223`
- Only authorized Organization Owners and Administrators can view raw unmasked numbers or export full records.
- Prevents customer database exfiltration by outgoing staff.

---

## 3. What We Do NOT Collect

1. **No Audio Recording or Microphone Access**:
   The Android agent does not request `RECORD_AUDIO` permission and does not access the device microphone.
2. **No SMS or Message Content**:
   The agent does not request `READ_SMS` or `RECEIVE_SMS`.
3. **No Personal Contact Book Harvesting**:
   The agent does not harvest unrelated personal phonebook contacts.
4. **No Browsing History or Location Tracking**:
   The agent does not track GPS locations or background app activity.

---

## 4. Data Retention & Automatic Pruning

Organizations can configure data retention periods (e.g. 30, 60, 90, 365 days). Background pruning jobs purge call event records older than the designated retention window, adhering to GDPR storage limitation principles and local data protection regulations.
