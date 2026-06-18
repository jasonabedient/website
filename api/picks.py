from http.server import BaseHTTPRequestHandler
import urllib.request
import json

# Configure the current series score here
KNICKS_WINS = 4
SPURS_WINS = 1

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        url = "https://www.notion.so/api/v3/queryCollection"
        payload = {
            "collection": {
                "id": "49be482e-2837-44db-b6d2-924401b66b5b",
                "spaceId": "2250a9d1-6a01-403a-bc87-105a36fd117e"
            },
            "collectionView": {
                "id": "31d97294-f9a5-4bdb-b62b-875c05cbb2ce",
                "spaceId": "2250a9d1-6a01-403a-bc87-105a36fd117e"
            },
            "loader": {
                "type": "reducer",
                "reducers": {
                    "collection_group_results": {
                        "type": "results",
                        "limit": 100
                    }
                },
                "searchQuery": "",
                "userTimeZone": "America/Los_Angeles"
            }
        }
        
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
        
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req) as response:
                raw_data = json.loads(response.read().decode('utf-8'))
                parsed_response = self.parse_notion_data(raw_data)
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps(parsed_response, indent=2).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def parse_notion_data(self, data):
        blocks = data.get("recordMap", {}).get("block", {})
        collections = data.get("recordMap", {}).get("collection", {})
        
        schema = {}
        for col_id, col_val in collections.items():
            val_outer = col_val.get("value", {})
            val_inner = val_outer.get("value", {}) if isinstance(val_outer, dict) else {}
            if not val_inner:
                val_inner = val_outer
            schema = val_inner.get("schema", {})
            break
            
        col_mapping = {}
        for prop_id, prop_info in schema.items():
            name = prop_info.get("name", "")
            p_type = prop_info.get("type", "")
            if p_type == "title":
                col_mapping["name"] = name
            elif p_type == "select" and ("team" in name.lower() or "pick" in name.lower()):
                col_mapping["team"] = name
            elif p_type == "number" and ("length" in name.lower() or "series" in name.lower() or "games" in name.lower()):
                col_mapping["seriesLength"] = name
            elif p_type == "number" and "knicks" in name.lower():
                col_mapping["avgPpgKnicks"] = name
            elif p_type == "number" and "spurs" in name.lower():
                col_mapping["avgPpgSpurs"] = name
            elif p_type == "text" or "talk" in name.lower() or "notes" in name.lower():
                col_mapping["notes"] = name
            elif p_type == "status":
                col_mapping["status"] = name
            elif p_type == "checkbox":
                col_mapping["correct"] = name
            elif p_type == "number" and "streak" in name.lower():
                col_mapping["streak"] = name

        picks = []
        team1_ppg_sum = 0
        team1_ppg_count = 0
        team2_ppg_sum = 0
        team2_ppg_count = 0
        team1_picks_count = 0
        team2_picks_count = 0

        name_col = col_mapping.get("name", "Name")
        team_col = col_mapping.get("team", "Team Pick")
        length_col = col_mapping.get("seriesLength", "Series Length")
        knicks_col = col_mapping.get("avgPpgKnicks", "AVG PPG Knicks")
        spurs_col = col_mapping.get("avgPpgSpurs", "AVG PPG Spurs")
        notes_col = col_mapping.get("notes", "Notes")
        status_col = col_mapping.get("status", "Status")
        streak_col = col_mapping.get("streak", "Current Streak")
        correct_col = col_mapping.get("correct", "Correct Team So Far")

        for block_id, block_data in blocks.items():
            val_outer = block_data.get("value", {})
            if not val_outer:
                continue
            val = val_outer.get("value", {})
            if not val or val.get("type") != "page":
                continue
                
            props = val.get("properties", {})
            row = {}
            for prop_id, prop_val in props.items():
                prop_name = schema.get(prop_id, {}).get("name", prop_id)
                text_val = ""
                if prop_val and isinstance(prop_val, list):
                    text_val = "".join([item[0] for item in prop_val if isinstance(item, list) and len(item) > 0])
                else:
                    text_val = str(prop_val)
                row[prop_name] = text_val

            if name_col not in row and team_col not in row:
                continue

            name = row.get(name_col, "Anonymous")
            team = row.get(team_col, "Unknown")
            series_length = int(row.get(length_col, 0)) if row.get(length_col) else 0
            
            avg_ppg_knicks = float(row.get(knicks_col, 0)) if row.get(knicks_col) else 0
            avg_ppg_spurs = float(row.get(spurs_col, 0)) if row.get(spurs_col) else 0
            
            notes = row.get(notes_col, "")
            if not notes and "Trash Talk" in row:
                notes = row.get("Trash Talk", "")
            if not notes and "Notes" in row:
                notes = row.get("Notes", "")

            status = row.get(status_col, "Active")
            streak = int(row.get(streak_col, 0)) if row.get(streak_col) else 0
            correct = row.get(correct_col, "No")

            picks.append({
                "name": name,
                "team": team,
                "seriesLength": series_length,
                "avgPpgKnicks": avg_ppg_knicks,
                "avgPpgSpurs": avg_ppg_spurs,
                "notes": notes,
                "status": status,
                "streak": streak,
                "correct": correct
            })

            if team == "Knicks":
                team1_picks_count += 1
            elif team == "Spurs":
                team2_picks_count += 1

            if avg_ppg_knicks > 0:
                team1_ppg_sum += avg_ppg_knicks
                team1_ppg_count += 1
            if avg_ppg_spurs > 0:
                team2_ppg_sum += avg_ppg_spurs
                team2_ppg_count += 1

        leaderboard = []
        for pick in picks:
            # 1. Earn 1 point for every game won by your picked team so far
            points = 0
            if pick["team"] == "Knicks":
                points += KNICKS_WINS
            elif pick["team"] == "Spurs":
                points += SPURS_WINS
                
            # 2. Check if series is completed (first to 4 wins)
            series_winner = None
            if KNICKS_WINS >= 4:
                series_winner = "Knicks"
            elif SPURS_WINS >= 4:
                series_winner = "Spurs"
                
            if series_winner:
                # Earn +5 bonus points for picking correct series winner
                if pick["team"] == series_winner:
                    points += 5
                # Earn +3 bonus points for picking exact series length
                total_games = KNICKS_WINS + SPURS_WINS
                if pick["seriesLength"] == total_games:
                    points += 3

            leaderboard.append({
                "name": pick["name"],
                "team": pick["team"],
                "points": points,
                "streak": pick["streak"]
            })
        leaderboard.sort(key=lambda x: (x["points"], x["streak"]), reverse=True)

        return {
            "matchup": {
                "team1": "Knicks",
                "team2": "Spurs",
                "team1AvgPPG": round(team1_ppg_sum / team1_ppg_count, 1) if team1_ppg_count > 0 else 0,
                "team2AvgPPG": round(team2_ppg_sum / team2_ppg_count, 1) if team2_ppg_count > 0 else 0,
                "team1PicksCount": team1_picks_count,
                "team2PicksCount": team2_picks_count,
                "knicksWins": KNICKS_WINS,
                "spursWins": SPURS_WINS
            },
            "picks": picks,
            "leaderboard": leaderboard
        }
