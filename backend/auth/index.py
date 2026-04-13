"""
Авторизация пользователей: регистрация, вход, проверка статуса подписки.
Action передаётся в body: register, login, status.
"""
import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
import psycopg2


CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def make_token() -> str:
    return secrets.token_hex(32)


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    body = {}
    if event.get('body'):
        body = json.loads(event['body'])

    action = body.get('action', '')
    conn = get_db()
    cur = conn.cursor()

    # Регистрация
    if action == 'register':
        email = body.get('email', '').strip().lower()
        password = body.get('password', '')
        if not email or not password:
            conn.close()
            return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Email и пароль обязательны'})}

        cur.execute("SELECT id FROM sf_users WHERE email = %s", (email,))
        if cur.fetchone():
            conn.close()
            return {'statusCode': 409, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Пользователь уже существует'})}

        pw_hash = hash_password(password)
        cur.execute(
            "INSERT INTO sf_users (email, password_hash) VALUES (%s, %s) RETURNING id",
            (email, pw_hash)
        )
        user_id = cur.fetchone()[0]

        trial_ends = datetime.utcnow() + timedelta(days=3)
        cur.execute(
            "INSERT INTO sf_subscriptions (user_id, plan, status, trial_ends_at) VALUES (%s, 'trial', 'active', %s)",
            (user_id, trial_ends)
        )

        token = make_token()
        cur.execute("UPDATE sf_users SET session_token = %s WHERE id = %s", (token, user_id))
        conn.commit()
        conn.close()
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'token': token,
                'email': email,
                'plan': 'trial',
                'status': 'active',
                'has_access': True,
                'trial_ends_at': trial_ends.isoformat()
            })
        }

    # Вход
    if action == 'login':
        email = body.get('email', '').strip().lower()
        password = body.get('password', '')
        pw_hash = hash_password(password)

        cur.execute("SELECT id, email FROM sf_users WHERE email = %s AND password_hash = %s", (email, pw_hash))
        user = cur.fetchone()
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Неверный email или пароль'})}

        user_id = user[0]
        token = make_token()
        cur.execute("UPDATE sf_users SET session_token = %s WHERE id = %s", (token, user_id))
        conn.commit()

        cur.execute(
            "SELECT plan, status, trial_ends_at, paid_until FROM sf_subscriptions WHERE user_id = %s ORDER BY id DESC LIMIT 1",
            (user_id,)
        )
        sub = cur.fetchone()
        conn.close()

        now = datetime.utcnow()
        plan = sub[0] if sub else 'none'
        status = sub[1] if sub else 'inactive'
        trial_ends_at = sub[2] if sub and sub[2] else None
        paid_until = sub[3] if sub and sub[3] else None

        has_access = False
        if plan == 'trial' and trial_ends_at and trial_ends_at > now:
            has_access = True
        elif plan == 'pro' and paid_until and paid_until > now:
            has_access = True

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'token': token,
                'email': email,
                'plan': plan,
                'status': status,
                'has_access': has_access,
                'trial_ends_at': trial_ends_at.isoformat() if trial_ends_at else None,
                'paid_until': paid_until.isoformat() if paid_until else None,
            })
        }

    # Проверка статуса
    if action == 'status':
        token = body.get('token') or (event.get('headers') or {}).get('X-Session-Token') or (event.get('headers') or {}).get('x-session-token')
        if not token:
            conn.close()
            return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Не авторизован'})}

        cur.execute("SELECT id, email FROM sf_users WHERE session_token = %s", (token,))
        user = cur.fetchone()
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Невалидный токен'})}

        user_id, email = user
        cur.execute(
            "SELECT plan, status, trial_ends_at, paid_until FROM sf_subscriptions WHERE user_id = %s ORDER BY id DESC LIMIT 1",
            (user_id,)
        )
        sub = cur.fetchone()
        conn.close()

        now = datetime.utcnow()
        plan = sub[0] if sub else 'none'
        status = sub[1] if sub else 'inactive'
        trial_ends_at = sub[2] if sub and sub[2] else None
        paid_until = sub[3] if sub and sub[3] else None

        has_access = False
        if plan == 'trial' and trial_ends_at and trial_ends_at > now:
            has_access = True
        elif plan == 'pro' and paid_until and paid_until > now:
            has_access = True

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'email': email,
                'plan': plan,
                'status': status,
                'has_access': has_access,
                'trial_ends_at': trial_ends_at.isoformat() if trial_ends_at else None,
                'paid_until': paid_until.isoformat() if paid_until else None,
            })
        }

    conn.close()
    return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Неизвестное действие'})}