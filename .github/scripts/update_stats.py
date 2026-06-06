import urllib.request
import json
import os
import sys

# User configurations
GITHUB_USERNAME = "nihargnv"
LEETCODE_USERNAME = "nihargnv"

def fetch_github_stats(username):
    url = f"https://api.github.com/users/{username}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0", "Accept": "application/vnd.github.v3+json"}
    )
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode())
            return {
                "repos": data.get("public_repos", 0),
                "followers": data.get("followers", 0),
                "following": data.get("following", 0)
            }
    except Exception as e:
        print(f"Error fetching GitHub stats: {e}")
        return None

def fetch_leetcode_stats(username):
    url = "https://leetcode.com/graphql"
    
    # 1. Fetch solved counts
    solved_query = {
        "query": """
        query userProblemsSolved($username: String!) {
          matchedUser(username: $username) {
            submitStats {
              acSubmissionNum {
                difficulty
                count
              }
            }
          }
        }
        """,
        "variables": {"username": username}
      }
      
    # 2. Fetch rating
    rating_query = {
        "query": """
        query userContestRankingInfo($username: String!) {
          userContestRanking(username: $username) {
            rating
            globalRanking
          }
        }
        """,
        "variables": {"username": username}
    }

    req_solved = urllib.request.Request(
        url,
        data=json.dumps(solved_query).encode('utf-8'),
        headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
    )
    
    req_rating = urllib.request.Request(
        url,
        data=json.dumps(rating_query).encode('utf-8'),
        headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
    )

    stats = {
        "totalSolved": 0,
        "easySolved": 0,
        "mediumSolved": 0,
        "hardSolved": 0,
        "contestRating": 0,
        "globalRanking": "N/A"
    }

    try:
        # Get Solved Problems count
        with urllib.request.urlopen(req_solved) as res:
            res_data = json.loads(res.read().decode())
            user_data = res_data.get("data", {}).get("matchedUser", None)
            if user_data:
                ac_list = user_data["submitStats"]["acSubmissionNum"]
                for item in ac_list:
                    diff = item["difficulty"]
                    cnt = item["count"]
                    if diff == "All":
                        stats["totalSolved"] = cnt
                    elif diff == "Easy":
                        stats["easySolved"] = cnt
                    elif diff == "Medium":
                        stats["mediumSolved"] = cnt
                    elif diff == "Hard":
                        stats["hardSolved"] = cnt

        # Get Contest Rating info
        with urllib.request.urlopen(req_rating) as res:
            res_data = json.loads(res.read().decode())
            ranking_data = res_data.get("data", {}).get("userContestRanking", None)
            if ranking_data:
                stats["contestRating"] = round(ranking_data.get("rating", 0))
                stats["globalRanking"] = f"Top {ranking_data.get('globalRanking', 'N/A')}"
    except Exception as e:
        print(f"Error fetching LeetCode stats: {e}")
        return None
        
    return stats

def main():
    print("Fetching updated statistics...")
    
    gh = fetch_github_stats(GITHUB_USERNAME)
    lc = fetch_leetcode_stats(LEETCODE_USERNAME)
    
    if not gh and not lc:
        print("Failed to fetch statistics. Aborting.")
        sys.exit(1)
        
    # Read portfolio.json
    portfolio_path = os.path.join("data", "portfolio.json")
    if not os.path.exists(portfolio_path):
        print(f"Error: {portfolio_path} not found.")
        sys.exit(1)
        
    with open(portfolio_path, "r", encoding="utf-8") as f:
        portfolio = json.load(f)
        
    # Update date stamp
    import datetime
    today = datetime.datetime.now().strftime("%Y-%m-%d")

    # Patch fields
    if gh:
        portfolio["stats"]["github"]["publicRepos"] = gh["repos"]
        portfolio["stats"]["github"]["followers"] = gh["followers"]
        portfolio["stats"]["github"]["following"] = gh["following"]
        portfolio["stats"]["github"]["lastUpdated"] = today
        
        # update profiles section too
        for p in portfolio["codingProfiles"]:
            if p["platform"] == "GitHub":
                p["stats"]["repos"] = gh["repos"]
                p["stats"]["followers"] = gh["followers"]
                
    if lc:
        portfolio["stats"]["leetcode"]["totalSolved"] = lc["totalSolved"]
        portfolio["stats"]["leetcode"]["easySolved"] = lc["easySolved"]
        portfolio["stats"]["leetcode"]["mediumSolved"] = lc["mediumSolved"]
        portfolio["stats"]["leetcode"]["hardSolved"] = lc["hardSolved"]
        portfolio["stats"]["leetcode"]["contestRating"] = lc["contestRating"]
        portfolio["stats"]["leetcode"]["globalRanking"] = lc["globalRanking"]
        portfolio["stats"]["leetcode"]["lastUpdated"] = today
        
        # update profiles section too
        for p in portfolio["codingProfiles"]:
            if p["platform"] == "LeetCode":
                p["stats"]["solved"] = lc["totalSolved"]
                p["stats"]["contestRating"] = lc["contestRating"]
                p["stats"]["ranking"] = lc["globalRanking"]

    # Write back
    with open(portfolio_path, "w", encoding="utf-8") as f:
        json.dump(portfolio, f, indent=2, ensure_ascii=False)
        
    print("Successfully updated stats inside portfolio.json!")

if __name__ == "__main__":
    main()
