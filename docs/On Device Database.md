Short answer: yes—if your data is strongly relational and you’re on Expo, **WatermelonDB (SQLite/JSI) + your own encrypted delta-sync** is an excellent fit. It keeps a real relational store on-device (joins/indices, fast queries), and you define a lean “changes since cursor” protocol so only deltas move. If you want built-in conflict-free merges across many writers, **CR-SQLite** is the other relational contender (more integration work on RN/Expo). Couchbase Lite is great, but it’s not plain SQLite.

Below is a concrete plan with WatermelonDB, plus exactly how to do “new device” in an end-to-end encrypted (server-blind) way.

---

# **Why WatermelonDB fits highly relational data**

- SQLite under the hood → proper relations, indexes, and pragmatic joins via prepared queries.
- JSI/native bridge → fast for large tables (transactions and batch ops).
- You own the sync protocol shape → easy to make **true delta sync** and keep the server blind by sending only **encrypted ops**.

---

# **Minimal architecture (Expo + WatermelonDB + E2EE)**

## **On-device**

- **DB:** WatermelonDB models/tables (e.g., accounts, transactions, categories, links).
- **Crypto:** react-native-libsodium for AEAD (XChaCha20-Poly1305) and X25519; store your 256-bit **Account Root Key (ARK)** in expo-secure-store.
- **Change capture:** Emit **ops** on every create/update/delete:

```
{
  id, entity: "transaction:uuid",
  kind: "create|update|delete",
  fields: { ...minimal delta... },
  ts: logicalClock(),       // Lamport/HLC
  device_id
}
```

- Serialize → compress → AEAD-encrypt with a key derived from ARK (HKDF stream key).

## **Server (relay)**

- Two endpoints:
    - POST /push → accepts opaque ciphertext ops (idempotent).
    - GET /pull?cursor=… → returns ciphertext ops since cursor.
- Optionally a blob store for attachments (encrypted chunks addressed by hash of ciphertext).
- No plaintext, no server-side merge—clients merge.

## **Client sync loop**

1. **Push** pending ops (batch).
2. **Pull** ops after cursor.
3. **Apply**: translate ops to SQL in a single transaction (conflict policy below).
4. Advance cursor; repeat with backoff. Optionally nudge via silent push.

---

# **Conflict policy (simple + deterministic)**

- For scalar fields: **LWW** using a hybrid logical clock (HLC). Tie-break by device_id.
- For sets (tags): add-wins or remove-wins CRDT sets.
- Deletes: **tombstone ops** so older updates can’t resurrect rows.
- Keep a per-entity version (Lamport/HLC). On merge, apply only if incoming.version > local.version.

---

# **“User gets a new device” flows (E2EE)**

## **A) User still has the old phone (best UX)**

1. Old phone → “Add device” shows a **QR code** with a short-lived invite token and the old device’s ephemeral public key.
2. New phone scans → perform X25519 handshake with a **numeric safety code** UI (Signal-style).
3. Old → encrypt the **ARK** to new device’s public key and send via relay (or BLE/WebRTC if nearby).
4. New phone now has ARK → performs **cold sync**:
    - Download latest **encrypted snapshot** (see below), decrypt, load into SQLite in a transaction.
    - Pull and apply ops after snapshot checkpoint.

## **B) Old phone is gone**

Offer at least one (ideally two) recovery channels:

- **Recovery code (mnemonic/32-40 chars)** generated at signup.
    - Locally wrap ARK with a key derived via **Argon2id** (+ salt), upload only the **wrapped ARK** (ciphertext) to relay.
    - On new device: user enters code → derive key → unwrap ARK → cold sync.
- **User-controlled encrypted export** (to iCloud Drive/Google Drive): an encrypted file containing {snapshot + ARK}; import on the new device and decrypt locally.

If neither exists, start a **new account** (fresh ARK) and warn about data loss.

## **C) Lost/stolen device security**

- From any remaining device: **revoke** the missing device id.
- Optional: bump a **key epoch** (derive new stream keys from ARK+epoch) so revoked devices can’t decrypt future ops/snaps.

---

# **Snapshots (speed up restores)**

- Periodically (e.g., daily/weekly) write a **compact snapshot** of current tables (or per-table) plus a **checkpoint cursor**.
- Encrypt snapshot(s) with ARK-derived key; upload ciphertext.
- On new device: fetch latest snapshot → decrypt → import → then apply only ops after checkpoint.
- Garbage-collect old snapshots after all devices have acknowledged newer ones.

---

# **Expo setup checklist (no back-and-forth needed)**

- EAS build (custom dev client) because you’ll use native modules.
- Add config plugins:
    - WatermelonDB (SQLite/JSI).
    - react-native-libsodium (there are community plugins that wire iOS/Android properly).
- Store keys in expo-secure-store. Never log or back up keys in plaintext.
- Optional: react-native-background-fetch/headless tasks for periodic sync; still design for pull-only.

---

# **Schema sketch (relational)**

Tables (example):

- accounts(id, name, currency, …)
- transactions(id, account_id, amount, currency, ts, memo, category_id, …)
- categories(id, name, parent_id)
- tx_tags(tx_id, tag_id) (many-to-many)
    
    Indices on transactions(account_id, ts), tx_tags(tag_id), etc.
    

For ops: store a local ops_outbox(id, ciphertext, retry_count) and sync_cursor(last_op_ts_or_id).

---

# **When you might pick CR-SQLite instead**

- You expect **lots of concurrent edits** across devices/users and want conflict-free merges built into SQLite objects.
- You’re okay doing extra RN/Expo integration work.
- You still follow the **same E2EE + snapshot + recovery** patterns above.

---

## **Bottom line**

- With **relational data on Expo**, **WatermelonDB + SQLite + your encrypted delta-sync** is a great, realistic choice.
- Implement “new device” with **ARK transfer** (QR invite) when the old phone exists, and **recovery code / encrypted snapshot** when it doesn’t.
- Add periodic **encrypted snapshots** to make restores fast and reliable.

If you want, I can drop a concrete package.json + app.config.js snippet for Expo, plus pseudocode for the QR invite and the snapshot import/apply routine.