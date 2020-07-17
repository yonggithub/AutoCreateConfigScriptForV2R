import React, { useState } from 'react';
import { Component } from 'react';
import { Button, Input, Table, Divider, Drawer } from 'antd';
import { linkDecode, getRes, decode, parse, outboundTemplateFun, genV2Config, downloadFileHelper, transferLinkListToConfigList } from '../utils/gobalUtils'
import { resolve } from 'url';
import { render } from '@testing-library/react';

export interface IndexProps {
    // vem:string|any,
    // config:any
}

export interface IndexState {
    vem: string | any,
    config: any,
    vems: string[],
    configs: any[],
    outboundTemplate: any,
    subscribe: string | any,
    configdatasource: any,
    visible: boolean,
    drawerContent: any,
    drawerIndex: number,
    drawerTitle: string,
    selectedRows: any,
    mountPath:string,
    loading:boolean
}




class Index extends React.Component<IndexProps, IndexState> {
    constructor(props: IndexProps) {
        super(props);
        this.state = {
            vem: "",
            config: {},
            vems: [],
            configs: [],
            outboundTemplate: {},
            subscribe: "",
            configdatasource: [],
            visible: false,
            drawerContent: {},
            drawerIndex: -1,
            drawerTitle: '',
            selectedRows: [],
            mountPath:"/volume1/docker/v2ray/",
            loading:false
        };
    }

    columns = [
        {
            title: '节点名字',
            dataIndex: 'ps',
            width: 50
        },
        {
            title: 'File name',
            dataIndex: 'title',
            width: 50
        },
        {
            title: 'content',
            dataIndex: 'content',
            width: 200,
            render: (txt: string, row: any, index: number) => {
                return <Button onClick={() => this.showDrawer(row, index)}>preview</Button>
            }
        },

    ];


    clickVemssSubmit = () => {
        let vem = this.state.vem
        let result: any = linkDecode(vem)
        let config: any = parse(result);
        let outboundTemplate: any = outboundTemplateFun(config)
        this.setState({ config, outboundTemplate })
    }

    clickSubscribeSubmit = () => {
        this.setState({loading:true})
        let subscribe = this.state.subscribe
        if (typeof subscribe !== "string" || !(subscribe.startsWith("http://") || subscribe.startsWith("https://"))) {
            alert("格式不正确")
        } else {
            let linkList = getRes(subscribe)
            linkList.then(result => {
                let linkList = decode(result).split(/\s+/);
                let configList = transferLinkListToConfigList(linkList)
                let configdatasource = configList.map((m, i) => ({ ps: m.ps, title: m.fileName, content: m.content, key: i }))
                this.setState({ configdatasource,loading:false })
               
            })
        }

    }

    showDrawer = (content: any, index: number) => {
        this.setState({
            visible: true,
            drawerTitle: content.ps,
            drawerContent: content.content,
            drawerIndex: index
        });
    };

    onClose = () => {
        this.setState({
            visible: false,
        });
    };


    // const [selectionType, setSelectionType] = useState('checkbox');
    // rowSelection object indicates the need for row selection
    rowSelection = {
        onChange: (selectedRowKeys: any, selectedRows: any) => {
            console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows);
            this.setState({ selectedRows })
        },
        getCheckboxProps: (record: any) => ({
            disabled: record.name === 'Disabled User', // Column configuration not to be checked
            name: record.name,
        }),
    };

    download = () => {
        let { selectedRows,mountPath } = this.state
        let commands = ''
        let dockerNames=''
        let ip_tail =80
        for (let i = 0; i < selectedRows.length; i++) {
            let fileName = "config" + i + ".json";
            let content = selectedRows[i]['content']
            let dockerName = "v2ray"+i+' '
            dockerNames+=dockerName
            let mountpathfile = `${mountPath}${fileName}`
            let command = `docker run --restart=always --name=${dockerName} --net=mynet --ip=192.168.1.${ip_tail} -v ${mountpathfile}:/etc/v2ray/config.json -p 8000:8000  -it -d v2ray/dev
            `
            commands+=command;
            downloadFileHelper(fileName, content)
            ip_tail+=1;
        }

        //download command file
        downloadFileHelper("configrun.sh",commands);
        let cc= "docker rm -f "+dockerNames+` 
        rm -f *.json`;
        downloadFileHelper("configremove.sh",cc)

    }

    render() {
        let { config, outboundTemplate, configdatasource, drawerContent, drawerIndex, visible, drawerTitle, selectedRows,mountPath,loading } = this.state
        let configJsonStringify = JSON.stringify(config)
        let outboundTemplateJsonStringify = JSON.stringify(outboundTemplate)
        return (<div style={{ paddingTop: 20 }}>
            <br />
      subscription: &nbsp;
            <Input style={{ width: '75%' }} onChange={(e) => this.setState({ subscribe: e.target.value })}></Input> &nbsp;
            <Button onClick={() => this.clickSubscribeSubmit()}> 提交  </Button>

            <br />
            <div style={{ width: '25%', float: 'left' }}>
                <h3>result: </h3>
            decodeLinks:{configdatasource.length}

                <h3>inbounds preview: </h3> <br />
                "port": 8000,<br />
                "protocol": "shadowsocks", <br />
                 "method": "aes-128-gcm",<br />
                "ota": true,<br />
                "password": "12345678"<br />

                <h3>挂载路径:(会影响到生成的执行脚本)</h3>
                <Input style={{width:"90%"}} value={mountPath} onChange={(e:any)=>this.setState({mountPath})}></Input>
            </div>

            <div style={{ width: '74%', float: 'left' }}>
                <h3>outbounds:</h3>
                <Divider />
                <Table
                 loading={loading}
                    scroll={{ y: 240 }}
                    rowSelection={{
                        type: "checkbox",
                        ...this.rowSelection,
                    }}
                    pagination={false}
                    columns={this.columns}
                    dataSource={this.state.configdatasource}
                />
            </div>

            <Drawer
                title={drawerTitle}
                placement={"top"}
                // closable={this.state.visible}
                onClose={this.onClose}
                visible={this.state.visible}
                key={drawerIndex}
            >
                <p>{drawerContent}</p>
            </Drawer>


            {selectedRows.length != 0 && <Button type={"primary"} onClick={this.download}>下载</Button>}
            <Divider style={{ paddingTop: 20 }} />
          vemss:&nbsp;
            <Input style={{ width: '60%' }}  onChange={(e) => this.setState({ vem: e.target.value })}></Input>&nbsp;
            <Button onClick={() => this.clickVemssSubmit()}> 提交  </Button>
            <br />
            <br />
            <h3> config preview:</h3>
     &nbsp;{configJsonStringify}
            <br />
            <br />
            <h3>outbound preview:</h3>
 &nbsp;{outboundTemplateJsonStringify}

            <br />
            <br />


        </div>);
    }
}

export default Index;



