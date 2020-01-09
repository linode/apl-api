
class DataProvider {
  readYaml(filePath) {
    console.debug("Reading file: " + filePath)
    let doc = yaml.safeLoad(fs.readFileSync(filePath, 'utf8'));
    return doc;
  }
  saveYaml(filePath, data) {
    console.debug("Saving file: " + filePath)
    let yamlStr = yaml.safeDump(data);
    fs.writeFileSync(filePath, yamlStr, 'utf8');
  }
}

module.exports = {
  DataProvider: DataProvider,
};