## Bonds/NCD CC & SI Plan

### 1. Context
- Bonds/NCD support currently reuses the legacy `StepProduct` block with static issuer data (`src/data/non_mf_issuers.json`). No backend schema or admin UI exists yet.
- FD/MF flows already use Scheme Management (`src/pages/SchemeManagementPage.jsx`) with dedicated modals per asset class. We will follow that structure for bonds.
- Collection Credit (CC) and Sales Incentive (SI) are simple percentages per scheme. Whenever an employee books a bond receipt, CC/SI = `investmentAmount * percent / 100`.

### 2. Data Model Additions
For each bond scheme/series record:
- `scheme_name` / `series_code`
- Primary identifiers (issuer key, ISIN, tenor, coupon rate) – reuse whatever fields we already track for bonds.
- **CC Percent (`cc_percent`)** – decimal stored as percentage (e.g., `1.25` for 1.25%).
- **SI Percent (`si_percent`)** – decimal percentage.
- Metadata flags (active/inactive, updated_by, updated_at).

Storage approach:
- Mirror FD structure by nesting `bond_schemes` inside a `bond_issuers` collection, or create a dedicated `bond_schemes` collection. Each schema entry gets the CC/SI numbers.
- No slabs, caps, or per-category overrides in v1 to keep scope tight.

### 3. Scheme Management UI (Admin)
1. **Bond Tab**  
   - Add third tab to `SchemeManagementPage.jsx` (MF / FD / Bond).  
   - Listing shows issuers. Selecting an issuer reveals all bond schemes in a detail panel/table.
2. **Scheme Modal / Drawer**  
   - Base fields: scheme name, series code, ISIN, tenor, coupon %, min application, status.  
   - Add two numeric inputs:
     - `Collection Credit (%)`
     - `Sales Incentive (%)`
   - Validation: required, range 0–100, up to two decimals. Highlight if either is zero.
3. **Display**  
   - In the schemes table, show CC% and SI% columns so admins see payout rates at a glance.
4. **API Wiring**  
   - Extend `api.js` with bond CRUD endpoints (mirroring FD `fd-schemes` routes).  
   - Ensure POST/PUT payloads include `cc_percent`/`si_percent`.

### 4. Receipt Creation Flow
1. New dedicated bond steps (mirroring FD steps):
   - `StepBondIssuer` – select issuer.
   - `StepBondScheme` – select scheme; show CC/SI percentages pulled from API.
   - `StepBondDetails` – enter investment amount; immediately compute:
     ```
     cc_amount = investmentAmount * (cc_percent / 100)
     si_amount = investmentAmount * (si_percent / 100)
     ```
2. Show the computed CC/SI in the details card (with percentage and absolute INR value).  
3. Pass both the percentages and computed amounts to `StepFinal` so preview + submit payload stays consistent.

### 5. Receipt Schema & Persistence
Extend backend receipt document (`routes/receipts.js`) with:
```js
bond_cc_percent, bond_cc_amount,
bond_si_percent, bond_si_amount,
bond_scheme_id, bond_scheme_name, bond_isin
```
- When a receipt request arrives, backend recalculates CC/SI using stored percentages (to avoid tampering) and overwrites incoming amounts if needed.
- Persisted values feed employee credit dashboards or exports.

### 6. Testing & Validation
- Admin form: ensure percent fields reject negatives or >100.
- Receipt flow: unit test calculation helper given amount/percent combos.
- Regression: confirm MF/FD tabs unaffected; bonds tab hidden for non-admins.

### 7. Future Enhancements (Optional)
- Caps or tiered CC/SI by ticket size.
- Channel-wise overrides (sub-brokers vs direct).
- Reporting widgets summarizing CC/SI earned per period.

This document should guide the implementation of CC/SI handling once bond scheme management is built out, keeping the UX in line with the existing FD/MF experiences.


