$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host "Logging in to OneUP Motors Render Portal as Admin..."
$body = @{ email="jyotsnaa786@gmail.com"; password="girdhar123" } | ConvertTo-Json
$res = Invoke-RestMethod -Uri "https://oneup-motors-audit.onrender.com/api/auth/login" -Method Post -Body $body -ContentType "application/json" -SessionVariable sess
Write-Host "Logged in successfully as $($res.name)."

Write-Host "Fetching live audit template..."
$tmpl = Invoke-RestMethod -Uri "https://oneup-motors-audit.onrender.com/api/audit-template" -Method Get -WebSession $sess

function Set-Item ($catIdx, $itemIdx, $result, $note) {
  $item = $tmpl[$catIdx].items[$itemIdx]
  if ($item.PSObject.Properties['result'] -eq $null) {
    $item | Add-Member -MemberType NoteProperty -Name "result" -Value $result
  } else {
    $item.result = $result
  }
  if ($item.PSObject.Properties['note'] -eq $null) {
    $item | Add-Member -MemberType NoteProperty -Name "note" -Value $note
  } else {
    $item.note = $note
  }
  if ($item.PSObject.Properties['evidence'] -eq $null) {
    $item | Add-Member -MemberType NoteProperty -Name "evidence" -Value @()
  } else {
    $item.evidence = @()
  }
}

# Initialize all to pass with empty note
for ($c = 0; $c -lt $tmpl.Length; $c++) {
  for ($i = 0; $i -lt $tmpl[$c].items.Length; $i++) {
    Set-Item $c $i "pass" ""
  }
}

Write-Host "Applying Manik & Jitendra inspection findings..."

# Cat 0: Security Gate (8/8 Passed - 100%)
Set-Item 0 0 "pass" "Entry done in a separate note pad, later in a fair register"
Set-Item 0 1 "pass" "Noted. However, no mention of belongings"
Set-Item 0 2 "pass" "Pisc taken"

# Cat 1: Customer Reception / Lounge (4/4 Passed - 100%)
Set-Item 1 1 "pass" "Spoken to the customers present in lounge"
Set-Item 1 2 "pass" "empty bottles found uncollected "
Set-Item 1 3 "pass" "TV, AC working"

# Cat 2: Vehicle Receiving & Inventory (6/6 Passed - 100%)
Set-Item 2 4 "pass" "No mention of inventory however"
Set-Item 2 5 "na" ""

# Cat 3: Job Card Opening (5/7 Passed - 71.4%)
Set-Item 3 3 "na" ""
Set-Item 3 4 "fail" "No repeat repair record kept of shown"
Set-Item 3 5 "fail" "No record found"

# Cat 4: Estimate & Customer Approval (4/5 Passed - 80%)
Set-Item 4 4 "na" ""
Set-Item 4 5 "fail" "Inconsistency found. No communication on whatsaap"

# Cat 5: Workshop Bay & Technician Allocation (5/5 Passed - 100%)
Set-Item 5 1 "pass" "No mechanism to dedicate a bay"
Set-Item 5 5 "na" "No key register or cabinet. During repair keys are in the cars itself "

# Cat 6: Repair Execution & Vehicle Tracking (4/6 Passed - 66.7%)
Set-Item 6 1 "na" "System work done only at billing"
Set-Item 6 3 "na" "No list provided yet to verify"
Set-Item 6 4 "fail" "Vague statements from VM and other staff. We were informed that the parts are sent to TP nagar. No storage or tagging shown to us"
Set-Item 6 6 "fail" "No WIP report maintained"

# Cat 7: Additional Work (4/4 Passed - 100%)
Set-Item 7 1 "pass" "approvals taken on calls. no such record maintained sseperately"
Set-Item 7 4 "na" "Customer often nonresponsive, Checked 5 record found ok on just one"

# Cat 8: Delay / Hold-up (2/5 Passed - 40%)
Set-Item 8 0 "fail" "No WIP report maintained. One excel sheet printout was shown to us"
Set-Item 8 1 "na" "No WIP report maintained as informed to us by WM"
Set-Item 8 2 "fail" ""
Set-Item 8 5 "fail" "No update"

# Cat 9: Parts (3/5 Passed - 60%)
Set-Item 9 3 "na" ""
Set-Item 9 4 "fail" "No storage/ labelling found"
Set-Item 9 5 "fail" "Vague statement received all replaced parts sent to TP Nagar, Last challan was on 31st July"
Set-Item 9 6 "na" "No such record"

# Cat 10: Road Test & Diagnosis (1/4 Passed - 25%)
Set-Item 10 1 "fail" "Only a road test register is maintained. No detailed findings written. The mentioned remarks not legible"
Set-Item 10 2 "na" ""
Set-Item 10 3 "fail" "Only a road test register is maintained. No detailed findings written. The mentioned remarks not legible"
Set-Item 10 4 "fail" "All register has only OK findings and a few AC related remarks"

# Cat 11: Final QC (1/4 Passed - 25%)
Set-Item 11 1 "na" "Paper work / Stystem work done after completion of work"
Set-Item 11 2 "na" ""
Set-Item 11 3 "fail" "QC List filled with all ok remarks, very often found blank"
Set-Item 11 4 "fail" ""
Set-Item 11 5 "na" ""
Set-Item 11 6 "fail" "No update on group work start. Vehicle got ready UP32 RY1694"

# Cat 12: Car Wash & Cleaning (3/4 Passed - 75%)
Set-Item 12 1 "pass" "Vehicle marked as ready, standing waiting for cleaning"
Set-Item 12 2 "fail" "Vacuum out of order. Washing register maintained for name's sake. timings mentioned on 15 mins interval disregarding the work"
Set-Item 12 4 "na" "Due to space constraint, cars parked near the gate"

# Cat 13: Bodyshop (0/0 Passed - 0% / NA)
for ($i = 0; $i -lt $tmpl[13].items.Length; $i++) { Set-Item 13 $i "na" "" }
Set-Item 13 0 "na" "Visit pending"

# Cat 14: Billing & Payment (7/7 Passed - 100%)
Set-Item 14 4 "na" "Approvals not found"
Set-Item 14 6 "na" ""
Set-Item 14 8 "pass" "found irregularities"

# Cat 15: Vehicle Ready & Delivery (4/7 Passed - 57.1%)
Set-Item 15 0 "pass" "Physical chk"
Set-Item 15 1 "na" "Due to space constraint vehicle are parked neat the gate"
Set-Item 15 2 "fail" "Inconsistent updates. No ready msg found"
Set-Item 15 3 "na" ""
Set-Item 15 5 "fail" "every check is found ok"
Set-Item 15 8 "fail" "NO thank you msg sent"

# Cat 16: Vehicle Drop (4/5 Passed - 80%)
Set-Item 16 0 "pass" "Scheduling done on calls"
Set-Item 16 1 "pass" "Updates on common whatsapp group"
Set-Item 16 4 "fail" "No acknowledgements recorded"

# Cat 17: Warranty & Technical Compliance (0/4 Passed - 0%)
Set-Item 17 0 "fail" "No reports/ parts shown "
Set-Item 17 1 "fail" ""
Set-Item 17 2 "na" ""
Set-Item 17 3 "fail" "Answers like `" we send everything to TP nagar`" received. "
Set-Item 17 4 "fail" "No record"

# Cat 18: Safety, Housekeeping & Infrastructure (2/5 Passed - 40%)
Set-Item 18 0 "fail" "oil everywhere. No cleanliness. "
Set-Item 18 1 "na" ""
Set-Item 18 2 "na" "No observations"
Set-Item 18 4 "na" ""
Set-Item 18 5 "fail" "No list found. WM on week off"
Set-Item 18 6 "fail" "Waste oil kept near electricals. Continuously leaking tank"
Set-Item 18 7 "na" ""

# Cat 19: EV / Specialised Bay (If Applicable) (0/0 Passed - 0% / NA)
if ($tmpl.Length -gt 19) {
  for ($i = 0; $i -lt $tmpl[19].items.Length; $i++) { Set-Item 19 $i "na" "" }
}

$payload = @{
  dealership_name = "OneUP Motors - Mahanagar"
  location = "Mahanagar, Lucknow"
  auditor_name = "Manik & Jitendra"
  audit_date = "2026-08-03"
  categories = @($tmpl)
  general_notes = "Held up vehicle job cards not provided. Statements given are not satisfactory. audit not supported well by the staff present."
} | ConvertTo-Json -Depth 15 -Compress

Write-Host "Posting complete restored Mahanagar audit payload to server..."
try {
  $posted = Invoke-RestMethod -Uri "https://oneup-motors-audit.onrender.com/api/audits" -Method Post -Body $payload -ContentType "application/json" -WebSession $sess
  Write-Host "SUCCESS! Restored Audit ID: $($posted.id) with Overall Score: $($posted.overall_score)% ($($posted.status))"
} catch {
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host "SERVER SUBMISSION ERROR DETAILS: $($reader.ReadToEnd())"
  } else {
    Write-Host "Network Error: $($_.Exception.Message)"
  }
}

Write-Host "`nCURRENT LIVE AUDITS ON PORTAL:"
$allAudits = Invoke-RestMethod -Uri "https://oneup-motors-audit.onrender.com/api/audits" -Method Get -WebSession $sess
$allAudits | Select-Object id, dealership_name, auditor_name, audit_date, overall_score, status | Format-Table -AutoSize
