from flask import Blueprint, request, redirect, render_template, session
from flask_bcrypt import Bcrypt
from utils.database import get_connection

auth = Blueprint("auth", __name__)

bcrypt = Bcrypt()


# =============================
# SIGNUP
# =============================

@auth.route("/signup", methods=["GET", "POST"])
def signup():

    if request.method == "POST":

        username = request.form["username"]
        email = request.form["email"]
        password = request.form["password"]

        # hash password
        password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

        conn = get_connection()
        cursor = conn.cursor()

        try:

            cursor.execute(
                "INSERT INTO users (username,email,password_hash) VALUES (?,?,?)",
                (username, email, password_hash)
            )

            conn.commit()

        except Exception:

            conn.close()
            return "Username or Email already exists"

        conn.close()

        return redirect("/login")

    return render_template("signup.html")


# =============================
# LOGIN
# =============================

@auth.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        email = request.form["email"]
        password = request.form["password"]

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id, username, password_hash FROM users WHERE email=?",
            (email,)
        )

        user = cursor.fetchone()
        conn.close()

        if user:

            user_id = user[0]
            username = user[1]
            password_hash = user[2]

            if bcrypt.check_password_hash(password_hash, password):

                session["user_id"] = user_id
                session["username"] = username

                return redirect("/dashboard")

        return render_template("login.html", error="Invalid email or password")

    return render_template("login.html")


# =============================
# LOGOUT
# =============================

@auth.route("/logout")
def logout():

    session.clear()

    return redirect("/login")