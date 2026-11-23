/**
 * ============================================================
 * KLE TECHNOLOGICAL UNIVERSITY — AI INTELLIGENCE TEST SUITE
 * backend/test-ai-features.js
 * ============================================================
 * Verifies all 6 AI SDLC features:
 *   1. Zero-Hallucination Complaint Structuring
 *   2. Safety Hazard Emergency Prioritization
 *   3. Intelligent Department Routing (CSE, Hostel, Library, Exam, IT)
 *   4. Intelligent Transportation Routing (Routes R-01 to R-04, Buses #01 to #04)
 *   5. Conversational AI Chatbot Intake Engine ("KLE Saarthi")
 *   6. Coordinator Draft Reply Generation & Summarization
 */

const {
  refineComplaint,
  detectSafetyHazard,
  intelligentRoute,
  chatWithGrievanceAI,
  generateDraftReply,
  summarizeGrievance,
  DEPARTMENTS,
  BUSES,
  ROUTES,
} = require('./utils/aiService');

let passCount = 0;
let failCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failCount++;
  }
}

async function runTestSuite() {
  console.log('\n============================================================');
  console.log('🏛️  KLE TECH GRIEVANCE PLATFORM — AI TEST SUITE VERIFICATION');
  console.log('============================================================\n');

  // ── TEST 1: ZERO-HALLUCINATION STRUCTURING ──
  console.log('── Test Suite 1: AI Complaint Structuring & Zero Hallucination ──');
  const rawText1 = 'Yesterday the projector in Room 302 stopped working during lecture';
  const structured1 = await refineComplaint(rawText1);

  assert(structured1.suggested_title && structured1.suggested_title.length > 5, 'Generates concise title');
  assert(structured1.formatted_description.includes('【What Happened】'), 'Includes What Happened section');
  assert(structured1.formatted_description.includes('【When & Where】'), 'Includes When & Where section');
  assert(structured1.formatted_description.includes('【Impact】'), 'Includes Impact section');
  assert(structured1.formatted_description.includes('【Requested Action】'), 'Includes Requested Action section');
  assert(structured1.formatted_description.includes('Room 302'), 'Extracts specified room number');
  assert(structured1.when_and_where.includes('yesterday') || structured1.when_and_where.includes('Room 302'), 'Preserves explicit time and location');

  // Test missing info does not hallucinate
  const rawText2 = 'AC is leaking';
  const structured2 = await refineComplaint(rawText2);
  assert(structured2.when_and_where.includes('[Not provided by student]'), 'Explicitly marks missing time/location as [Not provided by student]');

  // ── TEST 2: SAFETY HAZARD DETECTION ──
  console.log('\n── Test Suite 2: Safety Hazard & Emergency Prioritization ──');
  const safety1 = detectSafetyHazard('There was a short circuit and sparks coming from the switchboard in lab 101');
  assert(safety1.isHazard === true, 'Flags electrical sparks/short circuit as safety hazard');
  assert(safety1.priority === 'Critical', 'Assigns Critical priority to safety hazard');

  const safety2 = detectSafetyHazard('The bus driver was driving rashly and overspeeding on the highway');
  assert(safety2.isHazard === true, 'Flags transit rash driving and overspeeding');

  const safety3 = detectSafetyHazard('A student was bullied and harassed near 3rd gate');
  assert(safety3.isHazard === true, 'Flags bullying and harassment under anti-ragging');

  const safetyNormal = detectSafetyHazard('The library books need to be returned next week');
  assert(safetyNormal.isHazard === false, 'Standard complaints not flagged as safety hazard');

  // ── TEST 3: INTELLIGENT DEPARTMENT ROUTING ──
  console.log('\n── Test Suite 3: Intelligent Department Routing ──');
  const routeDept1 = await intelligentRoute('In CSE 3rd floor lab, the Linux workstation monitor is not turning on');
  assert(routeDept1.target_module === 'department', 'Routes CSE lab issue to department module');
  assert(routeDept1.department_code === 'CSE', 'Identifies CSE department code');
  assert(routeDept1.department_id === 1, 'Maps to CSE department ID 1');
  assert(routeDept1.suggested_category === 'Infrastructure' || routeDept1.suggested_category === 'Academic', 'Classifies as Infrastructure or Academic');

  const routeDept2 = await intelligentRoute('The hostel mess food in Block B had contaminated water and students fell sick');
  assert(routeDept2.target_module === 'department', 'Routes hostel mess issue to department module');
  assert(routeDept2.department_code === 'HSTEL', 'Identifies Hostel department code');
  assert(routeDept2.suggested_category === 'Hostel', 'Classifies under Hostel category');
  assert(routeDept2.is_safety_hazard === true, 'Recognizes sick students/contaminated water as critical safety hazard');

  const routeDept3 = await intelligentRoute('I have not received my semester exam marksheet and hall ticket verification is pending');
  assert(routeDept3.department_code === 'EXAM', 'Routes marksheet and hall ticket to Examination Cell');
  assert(routeDept3.suggested_category === 'Examination', 'Classifies under Examination category');

  const routeDept4 = await intelligentRoute('The library card scanner is not scanning my book return barcodes');
  assert(routeDept4.department_code === 'LIB', 'Routes library book scanner issue to Library');
  assert(routeDept4.suggested_category === 'Library', 'Classifies under Library category');

  // ── TEST 4: INTELLIGENT TRANSPORTATION ROUTING ──
  console.log('\n── Test Suite 4: Intelligent Transportation / Bus Routing ──');
  const routeBus1 = await intelligentRoute('Bus #02 from CBT Belagavi was 40 minutes late and skipped Bogarves stop');
  assert(routeBus1.target_module === 'transportation', 'Routes bus delay to transportation module');
  assert(routeBus1.route_number === 'R-01', 'Maps CBT stop to Route R-01');
  assert(routeBus1.bus_number && routeBus1.bus_number.includes('Bus #02'), 'Identifies Bus #02');
  assert(routeBus1.bus_complaint_type === 'delay' || routeBus1.bus_complaint_type === 'route_issue', 'Classifies as delay or route issue');

  const routeBus2 = await intelligentRoute('Severe overcrowding on RPD Cross Tilakwadi bus route with students standing on footboard');
  assert(routeBus2.target_module === 'transportation', 'Routes RPD transit complaint to transportation');
  assert(routeBus2.route_number === 'R-02', 'Maps RPD Cross to Route R-02');
  assert(routeBus2.is_safety_hazard === true, 'Footboard standing detected as safety hazard');

  const routeBus3 = await intelligentRoute('Bus from Belagavi Railway Station broke down near Chennamma circle due to engine smoke');
  assert(routeBus3.target_module === 'transportation', 'Routes breakdown to transportation');
  assert(routeBus3.route_number === 'R-03', 'Maps Railway Station & Chennamma Circle to Route R-03');
  assert(routeBus3.bus_complaint_type === 'maintenance', 'Classifies engine breakdown as maintenance');

  // ── TEST 5: CONVERSATIONAL AI CHATBOT ENGINE ──
  console.log('\n── Test Suite 5: Conversational AI Chatbot ("KLE Saarthi") ──');
  const chatGreeting = await chatWithGrievanceAI({ message: 'Hi good morning' });
  assert(chatGreeting.reply.toLowerCase().includes('kle') || chatGreeting.reply.toLowerCase().includes('assistant'), 'Responds to greeting with assistant persona');
  assert(chatGreeting.suggested_actions && chatGreeting.suggested_actions.length > 0, 'Offers quick action prompt chips');

  const chatGrievance = await chatWithGrievanceAI({ message: 'Yesterday CBT bus 01 was 30 mins late' });
  assert(chatGrievance.extracted_complaint !== null, 'Extracts grievance data from casual chat message');
  assert(chatGrievance.extracted_complaint.target_module === 'transportation', 'Chatbot routes transit grievance to transportation');
  assert(chatGrievance.extracted_complaint.formatted_description.length > 20, 'Generates structured report preview inside chatbot');

  // ── TEST 6: DRAFT REPLY & EXECUTIVE SUMMARIZATION ──
  console.log('\n── Test Suite 6: Coordinator Draft Reply & Executive Summary ──');
  const draftReply = await generateDraftReply({
    complaintTitle: 'Air Conditioner breakdown in MECH CAD Lab',
    categoryOrType: 'Infrastructure',
    status: 'In Progress',
  });
  assert(draftReply && draftReply.length > 40, 'Generates polite, university-grade coordinator response');

  const summary = await summarizeGrievance('The student reported that water purifier in Block A is broken. It has been leaking since Monday morning. Maintenance staff should inspect it urgently.');
  assert(summary && summary.length > 10, 'Generates concise executive summary');

  console.log('\n============================================================');
  console.log(`📊 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
