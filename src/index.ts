import ora from "ora";
import { scripts } from "../package.json";
import fetch from "node-fetch";
import { constants } from "fs";
import { writeFile, mkdtemp, chmod, mkdir } from "fs/promises";
import path from "path";
import { exec, ExecException } from "child_process";
import { tmpdir } from "os";
import readline from "readline";
import AdmZip from "adm-zip";
const minecraft_directory = require("minecraft-folder-path");

async function timeout(ms: number = 500) {
  return new Promise((resolve, _reject) => {
    setTimeout(resolve, ms);
  });
}
async function prompt(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
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
const spinner = ora();
let spinner_started = false;

async function main() {
  const papayacraft_manifest = await (
    await fetch(
      "https://storage.googleapis.com/papayacraft-downloads/pack-manifest.json"
    )
  ).json();
  const papayacraft_version: string = papayacraft_manifest["modpack-version"];

  console.log(
    `Estimated total install time: ${papayacraft_manifest["estimated-completion-time"]}`
  );
  await prompt_yes_no(
    `Would you like to install Papayacraft v${papayacraft_version}`,
    true,
    PromptSelection.YES
  );

  spinner.start(`Installing Papayacraft v${papayacraft_version}`);
  const tmp_dir = await mkdtemp(path.join(tmpdir(), "papayacraft-"));
  spinner.stop();

  if (
    await prompt_yes_no(`Install Minecraft Forge?`, false, PromptSelection.YES)
  ) {
    spinner.start("Downloading Forge 36.1.1 for Minecraft 1.16.5");
    spinner_started = true;
    // Install Minecraft Forge

    const forge_installer_dl = await fetch(
      `https://storage.googleapis.com/papayacraft-downloads/forge-1.16.5-36.1.1-installer.jar`
    );
    const installer = await forge_installer_dl.buffer();
    const forge_path = path.join(tmp_dir, "forge-install.jar");

    await writeFile(forge_path, installer, { encoding: "utf-8" });
    // await chmod(forge_path, constants.S_IRWXU);
    await chmod(forge_path, "511");

    spinner.text = "Installing Forge 36.1.1 for Minecraft 1.16.5";
    const { error } = await child(`java -jar ${forge_path}`);
    if (error !== null) {
      console.error(error);
      spinner.fail(
        "Error with forge installer! if install fails, manually install forge first!"
      );
      await timeout(100);
    } else {
      spinner.succeed();
    }
    spinner.text = `Downloading Papayacraft.zip`;
  } else {
    spinner.start(`Downloading Papayacraft.zip`);
    spinner_started = true;
  }

  // Install Pack
  const install_dir = `${minecraft_directory}/papaya/v${papayacraft_version}`;
  await mkdir(install_dir, {
    recursive: true,
  });

  const papaya_pack_dl = await fetch(
    `https://storage.googleapis.com/papayacraft-downloads/${papayacraft_version}-papayacraft.zip`
  );
  const pack = await papaya_pack_dl.buffer();
  const pack_path = path.join(tmp_dir, "pack.zip");

  await writeFile(pack_path, pack);
  spinner.text = "Unzipping Papayacraft.zip";
  await timeout(500);
  const pack_zip = new AdmZip(pack_path);
  pack_zip.deleteFile("config");
  pack_zip.extractAllTo(install_dir, true);
  await timeout(2500);

  spinner.succeed(`Successfully Installed at ${install_dir}`);
}
const spinner_render_loop = setInterval(() => {
  if (spinner_started) spinner.render();
}, 66);

enum PromptSelection {
  YES = "y",
  NO = "n",
}
async function prompt_yes_no(
  question: string,
  exitOnFail: boolean = false,
  defaultSelection = PromptSelection.YES
) {
  const prompt_string = `${question} (${
    defaultSelection === PromptSelection.YES ? "Y/n" : "y/N"
  }) `;
  const prompt_return = (await prompt(prompt_string)).toLowerCase();

  if (
    (defaultSelection === PromptSelection.YES && prompt_return === "") ||
    prompt_return == "y"
  ) {
    return true;
  } else if (
    (defaultSelection === PromptSelection.NO && prompt_return === "") ||
    prompt_return == "n"
  )
    if (exitOnFail) {
      throw new Error("User declined install");
    }
  return false;
}

main()
  .catch((err) => {
    console.warn(`Install error!`, err.message);
    if (err.message !== "User declined install") {
      console.warn(
        `please try to fix the issue above if possible and try again!`
      );
    }
  })
  .finally(async () => {
    console.log(`Wrapping up...`);
    spinner.stop();
    clearInterval(spinner_render_loop);
    await prompt("Press enter to exit installation! ");
  });
