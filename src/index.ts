import ora from "ora";
import { scripts } from "../package.json";
import fetch from "node-fetch";
import fs, { constants } from "fs";
import path from "path";
import { exec, ExecException } from "child_process";
const minecraft_directory = require("minecraft-folder-path");

async function timeout(ms: number = 500) {
  return new Promise((resolve, _reject) => {
    setTimeout(resolve, ms);
  });
}

async function child(
  command: string
): Promise<{ error: ExecException | null; stderr: string; stdout: string }> {
  return new Promise((res, _rej) => {
    try {
      exec(command, (error, stdout, stderr) => res({ error, stderr, stdout }));
    } catch (err) {
      res({ error: err, stderr: "", stdout: "" });
    }
  });
}
const papayacraft_version = scripts.CRAFT_VERSION;

async function main() {
  const spinner = ora(`Installing Papayacraft v${papayacraft_version}`).start();
  await timeout(100);
  spinner.succeed();
  spinner.text = "Downloading Forge 36.1.1 for Minecraft 1.16.5";
  spinner.render();
  const forge_installer_dl = await fetch(
    `https://storage.googleapis.com/papayacraft-downloads/forge-1.16.5-36.1.1-installer.jar`
  );
  const installer = await forge_installer_dl.buffer();
  const tmp_dir = fs.mkdtempSync("papayacraft-");
  fs.writeFileSync(path.join(tmp_dir, "forge-install.jar"), installer, {
    encoding: "utf-8",
  });
  fs.chmodSync(
    path.join("./", tmp_dir, "forge-install.jar"),
    constants.S_IRWXU
  );
  spinner.text = "Installing Forge 36.1.1 for Minecraft 1.16.5";
  spinner.render();
  const { stdout, error, stderr } = await child(
    `java -jar ${process.cwd()}/${tmp_dir}/forge-install.jar`
  );
  if (error) {
    spinner.fail(
      "Error with forge installer! if install fails, manually install forge first!"
    );
    await timeout(100);
  }
  spinner.succeed();
  spinner.info("Cleaning up!");
  await timeout();
  spinner.succeed();
  spinner.stop();
}

main()
  .then(() => {
    console.log(`Exiting successfully`);
  })
  .catch((err) => {
    console.warn(`Install failed!`);
    console.warn(err);
    console.warn(
      `please try to fix the issue above if possible and try again!`
    );
  });
