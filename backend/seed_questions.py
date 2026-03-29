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
    # Java Developer - Easy
    {"role": "Java Developer", "difficulty": "Easy", "question_text": "What is the difference between JDK, JRE, and JVM?", "hint": "JVM runs bytecode, JRE includes JVM + libraries, JDK includes JRE + compiler tools."},
    {"role": "Java Developer", "difficulty": "Easy", "question_text": "Explain the four pillars of Object-Oriented Programming in Java.", "hint": "Encapsulation, Abstraction, Inheritance, and Polymorphism — give a real-world example for each."},
    {"role": "Java Developer", "difficulty": "Easy", "question_text": "What is the difference between '==' and '.equals()' in Java?", "hint": "== compares references, .equals() compares content — think about String comparisons."},
    {"role": "Java Developer", "difficulty": "Easy", "question_text": "What are the access modifiers in Java?", "hint": "public, private, protected, and package-private (default). Know their visibility scope."},
    {"role": "Java Developer", "difficulty": "Easy", "question_text": "What is the difference between ArrayList and LinkedList in Java?", "hint": "Array-backed vs node-based. Think about random access vs frequent insertions."},

    # Java Developer - Medium
    {"role": "Java Developer", "difficulty": "Medium", "question_text": "How does the Java Garbage Collector work?", "hint": "Mention generational GC (Young, Old, Perm/Metaspace) and algorithms like G1 or CMS."},
    {"role": "Java Developer", "difficulty": "Medium", "question_text": "What is the difference between checked and unchecked exceptions in Java?", "hint": "Checked exceptions must be declared or caught at compile time; unchecked are runtime exceptions."},
    {"role": "Java Developer", "difficulty": "Medium", "question_text": "Explain the concept of multithreading in Java and how you synchronize threads.", "hint": "Mention the synchronized keyword, wait/notify, or java.util.concurrent tools like ReentrantLock."},
    {"role": "Java Developer", "difficulty": "Medium", "question_text": "What is the Java Stream API and what advantages does it offer?", "hint": "Functional-style operations on collections: filter, map, reduce. Also mention lazy evaluation."},
    {"role": "Java Developer", "difficulty": "Medium", "question_text": "What design patterns have you used in Java, and when?", "hint": "Mention Singleton, Factory, Builder, or Observer with a concrete use case for each."},

    # Java Developer - Hard
    {"role": "Java Developer", "difficulty": "Hard", "question_text": "Explain the Java Memory Model and how it relates to the volatile keyword.", "hint": "Discuss the happens-before relation, CPU cache visibility, and why volatile doesn't make compound actions atomic."},
    {"role": "Java Developer", "difficulty": "Hard", "question_text": "What is the difference between ReentrantLock and synchronized in Java?", "hint": "ReentrantLock allows try-lock, timed lock, interruptible lock, and fairness policy — synchronized does not."},
    {"role": "Java Developer", "difficulty": "Hard", "question_text": "How would you design a thread-safe LRU cache in Java without using Hashtable?", "hint": "LinkedHashMap with access-order + Collections.synchronizedMap, or ConcurrentHashMap + ConcurrentLinkedDeque."},

    # Frontend Developer - Easy
    {"role": "Frontend Developer", "difficulty": "Easy", "question_text": "What is the difference between 'let', 'const', and 'var' in JavaScript?", "hint": "Focus on scope (block vs function), hoisting, and mutability."},
    {"role": "Frontend Developer", "difficulty": "Easy", "question_text": "Explain the CSS Box Model.", "hint": "Content, Padding, Border, Margin — and how box-sizing: border-box changes width calculation."},
    {"role": "Frontend Developer", "difficulty": "Easy", "question_text": "What is the difference between flexbox and CSS Grid?", "hint": "Flex is one-dimensional (row or col), Grid is two-dimensional. Both are display properties."},
    {"role": "Frontend Developer", "difficulty": "Easy", "question_text": "What does 'semantic HTML' mean and why does it matter?", "hint": "Using tags like <article>, <nav>, <main> for meaning not just layout — improves SEO and accessibility."},
    {"role": "Frontend Developer", "difficulty": "Easy", "question_text": "What is event delegation in JavaScript?", "hint": "Attaching a single listener to a parent element to handle events from child elements via bubbling."},

    # Frontend Developer - Medium
    {"role": "Frontend Developer", "difficulty": "Medium", "question_text": "How does React's Virtual DOM work and why is it fast?", "hint": "React diffs the virtual tree and only patches real DOM changes, avoiding full re-renders."},
    {"role": "Frontend Developer", "difficulty": "Medium", "question_text": "Explain the useEffect hook in React and common pitfalls.", "hint": "Discuss dependency arrays, cleanup functions, and the stale closure problem."},
    {"role": "Frontend Developer", "difficulty": "Medium", "question_text": "What is debouncing vs throttling, and when do you use each?", "hint": "Debounce waits until inactivity (search input). Throttle limits calls over time (scroll, resize)."},
    {"role": "Frontend Developer", "difficulty": "Medium", "question_text": "How do you optimize the performance of a React application?", "hint": "Mention React.memo, useMemo, useCallback, code splitting (React.lazy + Suspense), and virtualization."},
    {"role": "Frontend Developer", "difficulty": "Medium", "question_text": "What is the difference between server-side rendering (SSR) and client-side rendering (CSR)?", "hint": "SSR sends pre-rendered HTML from the server (better SEO/FCP). CSR renders in the browser (better interactivity)."},

    # Frontend Developer - Hard
    {"role": "Frontend Developer", "difficulty": "Hard", "question_text": "How would you architect a large-scale React application for a team of 20 engineers?", "hint": "Feature-based folder structure, monorepo, module federation for microfrontends, shared design system."},
    {"role": "Frontend Developer", "difficulty": "Hard", "question_text": "Explain how the browser renders a webpage from HTML to paint.", "hint": "Parse HTML → DOM, parse CSS → CSSOM, combine into Render Tree → Layout → Paint → Composite."},
    {"role": "Frontend Developer", "difficulty": "Hard", "question_text": "What are Web Workers and when should you use them?", "hint": "They run scripts in background threads, leaving the main thread unblocked for UI updates. Use for heavy computation."},

    # Backend Developer - Easy
    {"role": "Backend Developer", "difficulty": "Easy", "question_text": "What is a REST API?", "hint": "Mention HTTP methods (GET, POST, PUT, DELETE), statelessness, and resource-based URLs."},
    {"role": "Backend Developer", "difficulty": "Easy", "question_text": "What is the difference between SQL and NoSQL databases?", "hint": "Structured relational schemas (ACID) vs flexible document/key-value stores (BASE)."},
    {"role": "Backend Developer", "difficulty": "Easy", "question_text": "What is middleware in the context of a web server?", "hint": "Functions that intercept the request/response cycle — logging, auth, parsing are common examples."},
    {"role": "Backend Developer", "difficulty": "Easy", "question_text": "What is a database index and when should you use one?", "hint": "Speeds up SELECT queries at the cost of slower writes and more storage. Use on frequently queried columns."},
    {"role": "Backend Developer", "difficulty": "Easy", "question_text": "Explain the difference between authentication and authorization.", "hint": "Auth = who you are (identity). Authz = what you're allowed to do (permissions)."},

    # Backend Developer - Medium
    {"role": "Backend Developer", "difficulty": "Medium", "question_text": "How do you prevent SQL injection in a backend API?", "hint": "Parameterized queries / prepared statements. Never interpolate user input directly into SQL strings."},
    {"role": "Backend Developer", "difficulty": "Medium", "question_text": "Explain the difference between horizontal and vertical scaling.", "hint": "Vertical = bigger machine. Horizontal = more machines (requires stateless design and a load balancer)."},
    {"role": "Backend Developer", "difficulty": "Medium", "question_text": "What is caching and what are common caching strategies?", "hint": "Cache-aside, write-through, write-behind. Mention Redis and TTL/eviction policies."},
    {"role": "Backend Developer", "difficulty": "Medium", "question_text": "What is a message queue and when would you use one?", "hint": "Decouples producers from consumers. Useful for async tasks, retries, and traffic spikes. Examples: Kafka, RabbitMQ."},
    {"role": "Backend Developer", "difficulty": "Medium", "question_text": "How does JWT (JSON Web Token) authentication work?", "hint": "Header.Payload.Signature — server signs with a secret, client sends it on each request, server verifies the signature."},

    # Backend Developer - Hard
    {"role": "Backend Developer", "difficulty": "Hard", "question_text": "How would you design a distributed rate limiter for an API?", "hint": "Token Bucket or Leaky Bucket algorithm. Use Redis with Lua scripts for atomic counter operations per user/IP."},
    {"role": "Backend Developer", "difficulty": "Hard", "question_text": "What is the N+1 query problem, and how do you solve it?", "hint": "Fetching a list then querying each item in a loop. Solve with JOIN-based eager loading or DataLoader batching."},
    {"role": "Backend Developer", "difficulty": "Hard", "question_text": "Explain the Saga pattern for distributed transactions across microservices.", "hint": "Choreography (event-driven) vs Orchestration (central coordinator). Discuss compensating transactions for rollback."},

    # Data Scientist - Easy
    {"role": "Data Scientist", "difficulty": "Easy", "question_text": "What is the difference between supervised and unsupervised learning?", "hint": "Supervised uses labeled data, unsupervised finds patterns in unlabeled data (clustering, dimensionality reduction)."},
    {"role": "Data Scientist", "difficulty": "Easy", "question_text": "Explain the bias-variance tradeoff.", "hint": "Bias → underfitting (too simple). Variance → overfitting (too sensitive to training data). Aim for balance."},
    {"role": "Data Scientist", "difficulty": "Easy", "question_text": "What is a p-value in statistics?", "hint": "The probability of observing your results (or more extreme) if the null hypothesis were true. p < 0.05 is typically significant."},
    {"role": "Data Scientist", "difficulty": "Easy", "question_text": "What is the difference between precision and recall?", "hint": "Precision = of predicted positives, how many are correct. Recall = of actual positives, how many did we catch."},
    {"role": "Data Scientist", "difficulty": "Easy", "question_text": "What is cross-validation and why is it used?", "hint": "Splitting data into k folds to train/test multiple times, giving a more reliable estimate of model performance."},

    # Data Scientist - Medium
    {"role": "Data Scientist", "difficulty": "Medium", "question_text": "How do you handle imbalanced datasets?", "hint": "SMOTE (oversampling), undersampling, class weights, or changing metric to F1/AUC-ROC instead of accuracy."},
    {"role": "Data Scientist", "difficulty": "Medium", "question_text": "Explain how a Random Forest algorithm works.", "hint": "Ensemble of decision trees on random feature/data subsets; final prediction by majority vote or averaging."},
    {"role": "Data Scientist", "difficulty": "Medium", "question_text": "What is regularization and what is the difference between L1 and L2?", "hint": "L1 (Lasso) drives coefficients to zero (feature selection). L2 (Ridge) shrinks them but rarely eliminates."},
    {"role": "Data Scientist", "difficulty": "Medium", "question_text": "Explain the difference between bagging and boosting.", "hint": "Bagging trains models in parallel on random subsets (reduces variance). Boosting trains sequentially, each fixing the previous model's errors."},
    {"role": "Data Scientist", "difficulty": "Medium", "question_text": "What is PCA (Principal Component Analysis) and when do you use it?", "hint": "Dimensionality reduction technique that finds orthogonal axes of maximum variance. Use for visualization or reducing features."},

    # Data Scientist - Hard
    {"role": "Data Scientist", "difficulty": "Hard", "question_text": "How would you detect and handle data leakage in a machine learning pipeline?", "hint": "Leakage occurs when info from outside the training set influences the model. Fit preprocessors only on training data, never test."},
    {"role": "Data Scientist", "difficulty": "Hard", "question_text": "Explain how gradient boosting works and what hyperparameters matter most.", "hint": "Iteratively fits trees to residuals. Key params: learning rate, n_estimators, max_depth, min_samples_leaf, subsample."},
    {"role": "Data Scientist", "difficulty": "Hard", "question_text": "What is the difference between a generative and a discriminative model?", "hint": "Generative models the joint P(X,Y) and can generate new data. Discriminative models P(Y|X) directly for classification."},
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
