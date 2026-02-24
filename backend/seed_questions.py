import sys
import os
import uuid

# Add backend directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from app.db.session import engine, SessionLocal
from app.db.models import QuestionBank
from sqlalchemy import text

questions_data = [
    # Software Engineer - Easy
    {"role": "Software Engineer", "difficulty": "Easy", "question_text": "What is the difference between an Array and a Linked List?", "hint": "Think about how they allocate memory and the time complexity for accessing vs inserting elements."},
    {"role": "Software Engineer", "difficulty": "Easy", "question_text": "Explain the concept of OOP (Object-Oriented Programming).", "hint": "Focus on the four main pillars: Encapsulation, Abstraction, Inheritance, and Polymorphism."},
    {"role": "Software Engineer", "difficulty": "Easy", "question_text": "What is a REST API?", "hint": "Mention HTTP methods (GET, POST, PUT, DELETE) and statelessness."},
    {"role": "Software Engineer", "difficulty": "Easy", "question_text": "Describe the MVC architecture pattern.", "hint": "Break down what Model, View, and Controller each handle in an application."},
    {"role": "Software Engineer", "difficulty": "Easy", "question_text": "What is version control, and why is Git useful?", "hint": "Think about collaboration, tracking history, and reverting changes."},
    {"role": "Software Engineer", "difficulty": "Easy", "question_text": "Explain the difference between synchronous and asynchronous programming.", "hint": "Use the analogy of waiting in line versus taking a buzzer at a restaurant."},
    {"role": "Software Engineer", "difficulty": "Easy", "question_text": "What is a database index?", "hint": "Compare it to the index at the back of a book to speed up data retrieval."},
    {"role": "Software Engineer", "difficulty": "Easy", "question_text": "How does a hash table work under the hood?", "hint": "Mention hash functions, buckets, and handling collisions."},
    {"role": "Software Engineer", "difficulty": "Easy", "question_text": "What is the purpose of unit testing?", "hint": "Focus on catching bugs early by testing small, isolated pieces of code."},
    {"role": "Software Engineer", "difficulty": "Easy", "question_text": "What is the difference between passed by value and passed by reference?", "hint": "Think about whether the actual variable is modified or just a copy of its data."},

    # Software Engineer - Medium
    {"role": "Software Engineer", "difficulty": "Medium", "question_text": "How do you handle race conditions in a multithreaded application?", "hint": "Discuss synchronization primitives like mutexes, semaphores, or locks."},
    {"role": "Software Engineer", "difficulty": "Medium", "question_text": "Explain how Garbage Collection works in languages like Java or Python.", "hint": "Mention reference counting or mark-and-sweep algorithms."},
    {"role": "Software Engineer", "difficulty": "Medium", "question_text": "What are the differences between SQL and NoSQL databases?", "hint": "Compare structured, relational schemas (ACID) with flexible, document-based schemas (BASE)."},
    {"role": "Software Engineer", "difficulty": "Medium", "question_text": "Describe the CAP Theorem.", "hint": "You can only pick two: Consistency, Availability, Partition Tolerance."},
    {"role": "Software Engineer", "difficulty": "Medium", "question_text": "How would you design a URL shortener like bit.ly?", "hint": "Talk about ID generation, base62 encoding, and redirect handling."},
    {"role": "Software Engineer", "difficulty": "Medium", "question_text": "Explain the difference between TCP and UDP.", "hint": "TCP is reliable and ordered (handshake), UDP is fast but fire-and-forget."},
    {"role": "Software Engineer", "difficulty": "Medium", "question_text": "What is Cross-Site Scripting (XSS) and how do you prevent it?", "hint": "Focus on untrusted user input being executed in the browser; mention sanitization and escaping."},
    {"role": "Software Engineer", "difficulty": "Medium", "question_text": "How do microservices differ from a monolithic architecture?", "hint": "Discuss independent deployment, specialized databases, vs a single unified codebase."},
    {"role": "Software Engineer", "difficulty": "Medium", "question_text": "What is a message queue and when would you use one?", "hint": "Mention decoupling services, async processing, and examples like Kafka or RabbitMQ."},
    {"role": "Software Engineer", "difficulty": "Medium", "question_text": "Explain how a Content Delivery Network (CDN) works.", "hint": "Talk about edge servers caching static assets physically closer to the user."},

    # Software Engineer - Hard
    {"role": "Software Engineer", "difficulty": "Hard", "question_text": "How do you design a system that needs to handle 1 million concurrent web sockets?", "hint": "Discuss server tuning (epoll/kqueue), load balancer configurations, and memory limits per connection."},
    {"role": "Software Engineer", "difficulty": "Hard", "question_text": "Explain the Paxos or Raft consensus algorithm.", "hint": "Focus on leader election, log replication, and handling split-brain scenarios."},
    {"role": "Software Engineer", "difficulty": "Hard", "question_text": "How would you implement a distributed rate limiter?", "hint": "Talk about Token Bucket or Leaky Bucket algorithms using Redis with Lua scripts for atomicity."},
    {"role": "Software Engineer", "difficulty": "Hard", "question_text": "Describe how B-trees and B+trees are used in database indexing.", "hint": "Focus on minimizing disk I/O, node splitting, and why B+ trees store all data in leaf nodes."},
    {"role": "Software Engineer", "difficulty": "Hard", "question_text": "What are memory leaks in garbage-collected languages, and how do you debug them?", "hint": "Discuss holding unintentional references to objects, making them unreachable by the GC, and using heap profilers."},
    {"role": "Software Engineer", "difficulty": "Hard", "question_text": "How do you achieve transactional guarantees across microservices?", "hint": "Mention the Saga pattern, Two-Phase Commit (2PC), and eventual consistency."},
    {"role": "Software Engineer", "difficulty": "Hard", "question_text": "Design a real-time collaborative document editor like Google Docs.", "hint": "The core algorithm to discuss is Operational Transformation (OT) or CRDTs to handle concurrent edits."},
    {"role": "Software Engineer", "difficulty": "Hard", "question_text": "Explain how HTTPS sets up a secure connection (SSL/TLS Handshake).", "hint": "Walk through the asymmetric exchange of certificates to establish a symmetric session key."},
    {"role": "Software Engineer", "difficulty": "Hard", "question_text": "How does consistent hashing work, and what problem does it solve?", "hint": "Explain the hash ring approach to minimize data movement when a server node is added or removed."},
    {"role": "Software Engineer", "difficulty": "Hard", "question_text": "What is the difference between concurrency and parallelism?", "hint": "Concurrency is managing multiple tasks at once (interleaving), parallelism is executing them simultaneously (multi-core)."},

    # Product Manager - Easy/Medium (just adding a few so the API doesn't fail if PM is selected)
    {"role": "Product Manager", "difficulty": "Easy", "question_text": "What is the life cycle of a product?", "hint": "Introduction, Growth, Maturity, Decline."},
    {"role": "Product Manager", "difficulty": "Easy", "question_text": "How do you prioritize features for a roadmap?", "hint": "Mention frameworks like RICE (Reach, Impact, Confidence, Effort) or MoSCoW."},
    {"role": "Product Manager", "difficulty": "Easy", "question_text": "What is an MVP (Minimum Viable Product)?", "hint": "The simplest version of a product that provides enough value to gather validated learning."},
    {"role": "Product Manager", "difficulty": "Medium", "question_text": "How do you handle a scenario where engineering says a feature will take twice as long as expected?", "hint": "Discuss scope negotiation, phasing the release, and assessing the core user value needed now."},
    {"role": "Product Manager", "difficulty": "Medium", "question_text": "Design a new feature for Spotify.", "hint": "Start with identifying a specific user pain point before jumping to the solution. (e.g. social listening)."},

    # Data Scientist - Easy/Medium
    {"role": "Data Scientist", "difficulty": "Easy", "question_text": "What is the difference between supervised and unsupervised learning?", "hint": "Supervised uses labeled data (known outcomes), unsupervised finds patterns in unlabeled data."},
    {"role": "Data Scientist", "difficulty": "Easy", "question_text": "Explain the bias-variance tradeoff.", "hint": "Bias leads to underfitting (too simple), variance leads to overfitting (too sensitive to training noise)."},
    {"role": "Data Scientist", "difficulty": "Easy", "question_text": "What is p-value in statistics?", "hint": "The probability of obtaining test results at least as extreme as the observed results, assuming the null hypothesis is true."},
    {"role": "Data Scientist", "difficulty": "Medium", "question_text": "How do you handle imbalanced datasets?", "hint": "Mention SMOTE (oversampling), undersampling, or changing the evaluation metric to F1-score rather than accuracy."},
    {"role": "Data Scientist", "difficulty": "Medium", "question_text": "Explain how a Random Forest algorithm works.", "hint": "It's an ensemble method that builds multiple decision trees on random subsets and averages their predictions to prevent overfitting."},
]

def main():
    print("Seeding QuestionBank...")
    
    db = SessionLocal()
    try:
        # Optional: Clear existing questions to start fresh
        db.execute(text("TRUNCATE TABLE question_bank CASCADE"))
        db.commit()
        print("Cleared existing questions.")
        
        count = 0
        for item in questions_data:
            q = QuestionBank(
                id=uuid.uuid4(),
                role=item["role"],
                difficulty=item["difficulty"],
                question_text=item["question_text"],
                hint=item["hint"]
            )
            db.add(q)
            count += 1
            
        db.commit()
        print(f"Successfully seeded {count} questions with hints!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
