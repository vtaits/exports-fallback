#!/usr/bin/env node

const commandLineArgs = require('command-line-args');
const fs = require('fs');
const path = require('path');

const options = commandLineArgs([
  { name: 'gitignore', alias: 'g', type: Boolean },
  { name: 'files', alias: 'f', type: Boolean },
  { name: 'help', alias: 'h', type: Boolean },
]);

if (options.help) {
  console.log('Create proxy directories by `export` field in `package.json` for older environments');
  console.log('');
  console.log('Parameters:');
  console.log('-g  Add created directories to .gitignore');
  console.log('-f  Write names of created directories to `files` section in `package.json`');
  console.log('-h  Show help');
  return;
}

const packageJSONUrl = path.resolve('./package.json');

if (!fs.existsSync(packageJSONUrl)) {
  throw new Error('`package.json` is not found in this directory');
}

const content = fs.readFileSync(packageJSONUrl, 'utf8');

const contentJSON = JSON.parse(content);

if (!contentJSON) {
  return;
}

const {
  exports: packageExports,
} = contentJSON;

if (!packageExports || typeof packageExports !== 'object') {
  return;
}

const generateInnerPath = (originalPath, depth) => {
  if (!originalPath) {
    return undefined;
  }

  const prefix = Array.from({
    length: depth,
  }).fill('..').join('/');

  return path.join(prefix, originalPath);
};

const generatedDirsSet = new Set();

Object.keys(packageExports)
  .forEach((exportPath) => {
    if (
      exportPath.includes('*')
      || exportPath === 'import'
      || exportPath === 'require'
    ) {
      return;
    }

    const pathSplit = exportPath.split('/');

    if (pathSplit[0] !== '.') {
      console.warn(`Invalid export path: "${exportPath}"`);
      return;
    }

    if (pathSplit.length < 2) {
      return;
    }

    const exportFromPackage = packageExports[exportPath];

    const exportRaw = typeof exportFromPackage === 'string'
      ? {
        require: exportFromPackage,
      }
      : exportFromPackage;

    const depth = pathSplit.length - 1;

    generatedDirsSet.add(pathSplit[1]);

    const exportForWrite = {
      main: generateInnerPath(exportRaw.require, depth),
      module: generateInnerPath(exportRaw.import, depth),
      types: generateInnerPath(exportRaw.types || exportRaw.typings, depth),
      typings: generateInnerPath(exportRaw.typings || exportRaw.types, depth),
    };

    const innerPackageJSONPath = path.resolve(exportPath, 'package.json');

    fs.mkdirSync(exportPath, {
      recursive: true,
    });

    fs.writeFileSync(innerPackageJSONPath, JSON.stringify(exportForWrite, null, 2));
  });

console.log('New dirs:\n');

[...generatedDirsSet].forEach((dirName) => {
  console.log(`./${dirName}`);
});

console.log('\n');

if (options.gitignore) {
  const gitignoreUrl = path.resolve('./.gitignore');

  if (!fs.existsSync(gitignoreUrl)) {
    const content = [...generatedDirsSet]
      .join('\n') + '\n';

    fs.writeFileSync(gitignoreUrl, content);

    console.log('Created .gitignore\n');
  } else {
    const prevContent = fs.readFileSync(gitignoreUrl, 'utf8').trim();

    const dirsToIncludeSet = new Set(generatedDirsSet);

    const lines = prevContent.length > 0
      ? prevContent.split(/\r?\n/)
      : [];

    lines.forEach((line) => {
      if (dirsToIncludeSet.has(line)) {
        dirsToIncludeSet.delete(line);
      }
    });

    const dirsToInclude = [...dirsToIncludeSet];

    if (dirsToInclude.length === 0) {
      console.log('.gitignore was not changed\n');
    } else {
      const nextContent = [...lines, ...dirsToInclude].join('\n') + '\n';

      fs.writeFileSync(gitignoreUrl, nextContent);

      console.log('Added rules to .gitignore\n');
    }
  }
}

if (options.files) {
  const {
    files: packageFiles,
  } = contentJSON;

  if (!packageFiles) {
    const nextContent = JSON.stringify({
      ...contentJSON,
      files: [...generatedDirsSet],
    }, null, 2);

    fs.writeFileSync(packageJSONUrl, nextContent);

    console.log('Created `files` section in `package.json`\n');
  } else {
    const dirsToIncludeSet = new Set(generatedDirsSet);

    packageFiles.forEach((line) => {
      const pureLine = line.replace(/^\.\/|^\/|\/$/g, '');

      if (dirsToIncludeSet.has(pureLine)) {
        dirsToIncludeSet.delete(pureLine);
      }
    });

    const dirsToInclude = [...dirsToIncludeSet];

    if (dirsToInclude.length === 0) {
      console.log('`files` section was not changed\n');
    } else {
      const nextContent = JSON.stringify({
        ...contentJSON,
        files: [
          ...packageFiles,
          ...dirsToInclude,
        ],
      }, null, 2);

      fs.writeFileSync(packageJSONUrl, nextContent);

      console.log('Added directories to `files` section');
    }
  }
}
