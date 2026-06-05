import re


def normalize_digits(value: str) -> str:
    return re.sub(r"\D", "", value)


def is_valid_cpf(cpf: str) -> bool:
    cpf = normalize_digits(cpf)

    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False

    for i in range(9, 11):
        total = sum(int(cpf[num]) * ((i + 1) - num) for num in range(0, i))
        digit = (total * 10 % 11) % 10
        if int(cpf[i]) != digit:
            return False

    return True
