/**
 * Author: DrowsyFlesh
 * Create: 2018/11/20
 * Description:
 */
import $ from 'jquery';
import _ from 'lodash';
import {Feature} from 'Libs/feature';
import {__, getURL, version} from 'Utils';
import apis from './apis';

export class VersionManager extends Feature {
    constructor() {
        super({
            name: 'versionManager',
            kind: 'other',
            permissions: ['notifications'],
            settings: {
                on: true,
                title: '自动检测更新',
                description: '仅仅进行检测而并不进行更新操作',
                type: 'checkbox',
                options: [
                    {key: 'notification', title: '推送通知', on: false},
                ],
            },
        });
        if (!this.store) {
            this.version = {
                version,
                day: new Date().getDate(),
            };
        }
        this.version = this.store;
    }

    launch = () => {
        this.request();
    };

    addListener = () => {
        chrome.runtime.onMessage.addListener((message) => {
            if (message.commend === 'checkVersion') {
                this.request(true);
            }
        });
    };

    setVersion = ({lastVersion} = {}) => {
        if (!this.store) {
            this.version = {
                version,
                day: new Date().getDate(),
            };
        } else {
            if (version) this.version.version = lastVersion;
            this.version.day = new Date().getDate();
        }
        this.store = this.version;
    };

    getVersion = () => {
        const v = this.store;
        if (v === undefined) {
            this.version = {
                version: null,
                day: null,
            };
        } else {
            this.store = v;
        }
        this.store = this.version;
        return this.store;
    };

    request = (ignore = false) => {
        const {day, version: localVersion} = this.getVersion() || {};
        const compareRes = this.isBiggerThan(localVersion, version);
        if (day !== this.getTodayDate() || compareRes < 0 || ignore || true) {
            //const notifyOn = _.find(this.settings.options, (o) => o.key === 'notification').on || ignore;
            $.ajax({
                method: 'get',
                url: apis.version,
                success: (res) => {
                    const compareRes = this.isBiggerThan(res.lastVersion, version);
                    if (compareRes <= 0) { // 本地版本比较新
                        res.lastVersion = version;
                        this.setVersion(res);
                        this.sendNotification(__('checkVersionNoNewVersion'), ignore);
                    } else if (compareRes > 0) { // 有新版本
                        this.setVersion(res);
                        this.sendNotification(__('checkVersionNewVersion') + res.lastVersion, ignore);
                    }
                },
                error: (e) => {
                    this.sendNotification(__('checkVersionGetUpdateError'), ignore);
                    console.error('Failed to check version', e);
                },
            });
        }
    };

    sendNotification = (message, ignore) => {
        const notifyOn = _.find(this.settings.options, (o) => o.key === 'notification').on || ignore;
        const notifyId = `bh-${this.name}-${(Math.random() * 1000).toFixed(0)}`;
        const iconUrl = getURL('/statics/imgs/cat.svg');
        const title = __('extensionNotificationTitle');
        const type = 'basic';
        notifyOn && chrome.notifications.create(notifyId, {type, iconUrl, title, message});
    };

    isBiggerThan = (a, b) => {
        if (a === b) {
            return 0;
        }

        let a_components = a.split('.');
        let b_components = b.split('.');

        let len = Math.min(a_components.length, b_components.length);

        // loop while the components are equal
        for (let i = 0; i < len; i++) {
            // A bigger than B
            if (parseInt(a_components[i] || 0) > parseInt(b_components[i] || 0)) {
                return 1;
            }

            // B bigger than A
            if (parseInt(a_components[i] || 0) < parseInt(b_components[i] || 0)) {
                return -1;
            }
        }

        // If one's a prefix of the other, the longer one is greater.
        if (a_components.length > b_components.length) {
            return 1;
        }

        if (a_components.length < b_components.length) {
            return -1;
        }

        // Otherwise they are the same.
        return 0;
    };
}
