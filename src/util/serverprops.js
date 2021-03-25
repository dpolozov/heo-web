const loadServerProps = async () => {
    //Load configs from server
    let response = await fetch('/api/env');
    let jsonConfig = await response.json();
    return jsonConfig;
}
export default loadServerProps;