import mysql.connector
from datetime import datetime, timedelta

# Database configuration
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'farmproject'
}

def simulate_anomaly():
    connection = None
    try:
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor()

        # 1. First, find a real animal ID that already exists in your database
        cursor.execute("SELECT animal_id FROM animal LIMIT 1")
        result = cursor.fetchone()

        if not result:
            print("❌ Error: No animals found in your database. Please register one animal first.")
            return

        animal_id = result[0]
        print(f"🔍 Selected real Animal ID: {animal_id} for simulation.")

        # 2. Clear old weighing data for this specific animal to avoid conflicts
        cursor.execute("DELETE FROM weighing WHERE animal_id = %s", (animal_id,))

        # 3. Insert weight records showing a HEALTH CRITICAL trend (Weight Loss)
        today = datetime.now()
        data = [
            (animal_id, (today - timedelta(days=60)).strftime('%Y-%m-%d'), 450.00), # 60 days ago
            (animal_id, (today - timedelta(days=30)).strftime('%Y-%m-%d'), 485.00), # 30 days ago (Healthy)
            (animal_id, today.strftime('%Y-%m-%d'), 470.00)                        # Today (15kg Loss!)
        ]

        # Using correct columns: animal_id, weighing_date, weight_kg
        query = "INSERT INTO weighing (animal_id, weighing_date, weight_kg) VALUES (%s, %s, %s)"
        cursor.executemany(query, data)

        connection.commit()
        print(f"✅ SUCCESS: Health anomaly simulated for Animal {animal_id}.")
        print("👉 Now, refresh your Dashboard (F5) to see the AI Alert.")

    except Exception as e:
        print(f"❌ Simulation Error: {e}")
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == "__main__":
    simulate_anomaly()