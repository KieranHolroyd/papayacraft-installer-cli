import ora from "ora";
import { scripts } from "../package.json";
import fetch from "node-fetch";
import { constants } from "fs";
import { createReadStream } from "fs-extra";
import { writeFile, mkdtemp, chmod, mkdir } from "fs/promises";
import path from "path";
import { exec, ExecException } from "child_process";
import { tmpdir } from "os";
import extract from "extract-zip";
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
const spinner = ora(`Installing Papayacraft v${papayacraft_version}`).start();

async function main() {
  await timeout(100);
  spinner.succeed();
  spinner.text = "Downloading Forge 36.1.1 for Minecraft 1.16.5";
  // Install Minecraft Forge
  const forge_installer_dl = await fetch(
    `https://storage.googleapis.com/papayacraft-downloads/forge-1.16.5-36.1.1-installer.jar`
  );
  const installer = await forge_installer_dl.buffer();
  const tmp_dir = await mkdtemp(path.join(tmpdir(), "papayacraft-"));
  const forge_path = path.join(tmp_dir, "forge-install.jar");
  await writeFile(forge_path, installer, { encoding: "utf-8" });
  await chmod(forge_path, constants.S_IRWXU);
  spinner.text = "Installing Forge 36.1.1 for Minecraft 1.16.5";
  const { stdout, error, stderr } = await child(`java -jar ${forge_path}`);
  if (error !== null) {
    console.error(error);
    spinner.fail(
      "Error with forge installer! if install fails, manually install forge first!"
    );
    await timeout(100);
  } else {
    spinner.succeed();
  }
  // Install Pack
  spinner.text = "Downloading Papayacraft.zip";
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
  await extract(pack_path, {
    dir: install_dir,
  });
  spinner.succeed(`Successfully Installed at ${install_dir}`);
}
const spinner_render_loop = setInterval(() => {
  spinner.render();
}, 50);
main()
  .then(() => {
    console.log(`Installed successfully`);
  })
  .catch((err) => {
    console.warn(`Install error!`);
    console.warn(err);
    console.warn(
      `please try to fix the issue above if possible and try again!`
    );
  })
  .finally(() => {
    console.log(`Wrapping up...`);
    clearInterval(spinner_render_loop);
  });
