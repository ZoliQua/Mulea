from typer.testing import CliRunner
from mulea.cli import app

runner = CliRunner()


def test_cli_ora_runs(tmp_path):
    gmt = tmp_path / "o.gmt"
    gmt.write_text("T1\tterm1\tg1\tg2\tg3\tg4\tg5\nT2\tterm2\tg6\tg7\tg8\tg9\tg10\n")
    target = tmp_path / "t.txt"
    target.write_text("\n".join(["g1", "g2", "g3", "g4", "g6"]) + "\n")
    bg = tmp_path / "b.txt"
    bg.write_text("\n".join([f"g{i}" for i in range(1, 21)]) + "\n")
    result = runner.invoke(app, ["ora", str(gmt), str(target), str(bg)])
    assert result.exit_code == 0
    assert "T1" in result.stdout
    assert "p_value" in result.stdout
