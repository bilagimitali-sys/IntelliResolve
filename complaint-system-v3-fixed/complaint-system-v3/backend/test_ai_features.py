"""
KLE TECHNOLOGICAL UNIVERSITY — AI INTELLIGENCE TEST SUITE (Python)
Verifies all 6 AI SDLC features.
"""

from __future__ import annotations

import asyncio
import sys

from utils.ai_service import (
    chat_with_grievance_ai,
    detect_safety_hazard,
    generate_draft_reply,
    intelligent_route,
    refine_complaint,
    summarize_grievance,
)


async def run_test_suite() -> int:
    pass_count = 0
    fail_count = 0

    def check(condition: bool, name: str) -> None:
        nonlocal pass_count, fail_count
        if condition:
            print(f"  ✅ PASS: {name}")
            pass_count += 1
        else:
            print(f"  ❌ FAIL: {name}")
            fail_count += 1

    print("\n============================================================")
    print("🏛️  KLE TECH GRIEVANCE PLATFORM — AI TEST SUITE VERIFICATION")
    print("============================================================\n")

    print("── Test Suite 1: AI Complaint Structuring & Zero Hallucination ──")
    s1 = await refine_complaint("Yesterday the projector in Room 302 stopped working during lecture")
    check(bool(s1.get("suggested_title") and len(s1["suggested_title"]) > 5), "Generates concise title")
    check("【What Happened】" in s1["formatted_description"], "Includes What Happened section")
    check("【When & Where】" in s1["formatted_description"], "Includes When & Where section")
    check("【Impact】" in s1["formatted_description"], "Includes Impact section")
    check("【Requested Action】" in s1["formatted_description"], "Includes Requested Action section")
    check("Room 302" in s1["formatted_description"], "Extracts specified room number")
    check("yesterday" in s1["when_and_where"].lower() or "Room 302" in s1["when_and_where"], "Preserves explicit time and location")

    s2 = await refine_complaint("AC is leaking")
    check("[Not provided by student]" in s2["when_and_where"], "Marks missing time/location as [Not provided by student]")

    print("\n── Test Suite 2: Safety Hazard & Emergency Prioritization ──")
    sf1 = detect_safety_hazard("There was a short circuit and sparks coming from the switchboard in lab 101")
    check(sf1["isHazard"] is True, "Flags electrical sparks/short circuit as safety hazard")
    check(sf1["priority"] == "Critical", "Assigns Critical priority to safety hazard")

    sf2 = detect_safety_hazard("The bus driver was driving rashly and overspeeding on the highway")
    check(sf2["isHazard"] is True, "Flags transit rash driving and overspeeding")

    sf3 = detect_safety_hazard("A student was bullied and harassed near 3rd gate")
    check(sf3["isHazard"] is True, "Flags bullying and harassment under anti-ragging")

    sf_norm = detect_safety_hazard("The library books need to be returned next week")
    check(sf_norm["isHazard"] is False, "Standard complaints not flagged as safety hazard")

    print("\n── Test Suite 3: Intelligent Department Routing ──")
    rd1 = await intelligent_route("In CSE 3rd floor lab, the Linux workstation monitor is not turning on")
    check(rd1["target_module"] == "department", "Routes CSE lab issue to department module")
    check(rd1["department_code"] == "CSE", "Identifies CSE department code")
    check(rd1["department_id"] == 1, "Maps to CSE department ID 1")
    check(rd1["suggested_category"] in ("Infrastructure", "Academic"), "Classifies as Infrastructure or Academic")

    rd2 = await intelligent_route("The hostel mess food in Block B had contaminated water and students fell sick")
    check(rd2["target_module"] == "department", "Routes hostel mess issue to department module")
    check(rd2["department_code"] == "HSTEL", "Identifies Hostel department code")
    check(rd2["suggested_category"] == "Hostel", "Classifies under Hostel category")
    check(rd2["is_safety_hazard"] is True, "Recognizes contaminated water as critical safety hazard")

    rd3 = await intelligent_route("I have not received my semester exam marksheet and hall ticket verification is pending")
    check(rd3["department_code"] == "EXAM", "Routes marksheet and hall ticket to Examination Cell")
    check(rd3["suggested_category"] == "Examination", "Classifies under Examination category")

    rd4 = await intelligent_route("The library card scanner is not scanning my book return barcodes")
    check(rd4["department_code"] == "LIB", "Routes library book scanner issue to Library")
    check(rd4["suggested_category"] == "Library", "Classifies under Library category")

    print("\n── Test Suite 4: Intelligent Transportation / Bus Routing ──")
    rb1 = await intelligent_route("Bus #02 from CBT Belagavi was 40 minutes late and skipped Bogarves stop")
    check(rb1["target_module"] == "transportation", "Routes bus delay to transportation module")
    check(rb1["route_number"] == "R-01", "Maps CBT stop to Route R-01")
    check(bool(rb1.get("bus_number") and "Bus #02" in rb1["bus_number"]), "Identifies Bus #02")
    check(rb1["bus_complaint_type"] in ("delay", "route_issue"), "Classifies as delay or route issue")

    rb2 = await intelligent_route("Severe overcrowding on RPD Cross Tilakwadi bus route with students standing on footboard")
    check(rb2["target_module"] == "transportation", "Routes RPD transit complaint to transportation")
    check(rb2["route_number"] == "R-02", "Maps RPD Cross to Route R-02")
    check(rb2["is_safety_hazard"] is True, "Footboard standing detected as safety hazard")

    rb3 = await intelligent_route("Bus from Belagavi Railway Station broke down near Chennamma circle due to engine smoke")
    check(rb3["target_module"] == "transportation", "Routes breakdown to transportation")
    check(rb3["route_number"] == "R-03", "Maps Railway Station & Chennamma Circle to Route R-03")
    check(rb3["bus_complaint_type"] == "maintenance", "Classifies engine breakdown as maintenance")

    print('\n── Test Suite 5: Conversational AI Chatbot ("KLE Saarthi") ──')
    cg = await chat_with_grievance_ai("Hi good morning")
    check("kle" in cg["reply"].lower() or "assistant" in cg["reply"].lower(), "Responds to greeting with assistant persona")
    check(bool(cg.get("suggested_actions")), "Offers quick action prompt chips")

    cgr = await chat_with_grievance_ai("Yesterday CBT bus 01 was 30 mins late")
    check(cgr.get("extracted_complaint") is not None, "Extracts grievance data from casual chat message")
    check(cgr["extracted_complaint"]["target_module"] == "transportation", "Chatbot routes transit grievance to transportation")
    check(len(cgr["extracted_complaint"]["formatted_description"]) > 20, "Generates structured report preview inside chatbot")
    check(bool(cgr.get("recommendations")), "Provides actionable recommendations")

    cq = await chat_with_grievance_ai("❓ How does intelligent routing work?")
    check(cq.get("extracted_complaint") is None, "Does not generate dummy complaint draft for questions")
    check("routing" in cq["reply"].lower() and bool(cq.get("recommendations")), "Answers question directly with recommendations")

    print("\n── Test Suite 6: Coordinator Draft Reply & Executive Summary ──")
    draft = await generate_draft_reply(
        complaint_title="Air Conditioner breakdown in MECH CAD Lab",
        category_or_type="Infrastructure",
        status="In Progress",
    )
    check(bool(draft and len(draft) > 40), "Generates polite, university-grade coordinator response")

    summary = await summarize_grievance(
        "The student reported that water purifier in Block A is broken. "
        "It has been leaking since Monday morning. Maintenance staff should inspect it urgently."
    )
    check(bool(summary and len(summary) > 10), "Generates concise executive summary")

    print("\n============================================================")
    print(f"📊 TEST RESULTS: {pass_count} PASSED, {fail_count} FAILED")
    print("============================================================\n")
    return 1 if fail_count > 0 else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run_test_suite()))
