from app.core.security import generate_token, hash_password, verify_password


def test_verify_password_accepts_the_correct_password():
    hashed = hash_password("correct horse battery staple")
    assert verify_password("correct horse battery staple", hashed)


def test_verify_password_rejects_the_wrong_password():
    hashed = hash_password("correct horse battery staple")
    assert not verify_password("wrong password", hashed)


def test_passwords_longer_than_72_bytes_are_handled_consistently():
    long_password = "a" * 200
    hashed = hash_password(long_password)
    assert verify_password(long_password, hashed)
    assert verify_password("a" * 72, hashed)  # bcrypt truncation, applied consistently


def test_generate_token_produces_unique_values():
    assert generate_token() != generate_token()
