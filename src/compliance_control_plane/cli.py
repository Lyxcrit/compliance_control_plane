"""Small inspection CLI for framework packs."""

import argparse

from .content import load_framework


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect a compliance framework pack")
    parser.add_argument("path", help="Path to a framework JSON pack")
    args = parser.parse_args()
    framework = load_framework(args.path)
    print(f"{framework.name} {framework.version}")
    print(f"Authority: {framework.authority}")
    print(f"Requirements: {len(framework.requirements)}")
    for requirement in framework.requirements:
        print(f"- {requirement.key}: {requirement.title}")


if __name__ == "__main__":
    main()

